// components/quotes/QuoteChat.tsx
// @ts-nocheck
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Paperclip, Send, Loader2, UserIcon, DownloadIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { UserProfile } from '@/lib/auth';
import { attachmentFileSchema } from '@/lib/validators/message';
import { z } from 'zod';
import { getSignedUrl } from '@/lib/storage';

interface QuoteChatProps {
  quoteId: string;
  currentUserProfile: UserProfile;
}

// Type for a message from Supabase (including sender_profile for display)
type MessageWithSender = Database['public']['Tables']['messages']['Row'] & {
  profiles: { full_name: string | null; email: string; role: string } | null;
  // Add a field for signed URLs of attachments, which are generated client-side
  attachments_with_signed_urls?: Array<
    { file_url: string; file_name: string; mime_type?: string; size?: number; signed_url?: string }
  >;
};

export function QuoteChat({ quoteId, currentUserProfile }: QuoteChatProps) {
  const [messages, setMessages] = useState<MessageWithSender[]>([]);
  const [newMessageContent, setNewMessageContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();
  const { toast } = useToast();

  const channelName = `quote-messages-${quoteId}`;

  // Function to fetch messages and subscribe to real-time updates
  useEffect(() => {
    async function fetchInitialMessages() {
      setLoading(true);
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          profiles (full_name, email, role)
        `)
        .eq('quote_id', quoteId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching initial messages:', error);
        toast({
          title: 'Error Loading Messages',
          description: error.message,
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      const messagesWithSignedUrls = await Promise.all(
        (data || []).map(async (msg: MessageWithSender) => {
          if (msg.attachments && msg.attachments.length > 0) {
            const attachmentsWithUrls = await Promise.all(
              msg.attachments.map(async (attachment: any) => { // attachment type from JSONB is 'any'
                if (attachment.file_url) {
                  const { signedUrl } = await getSignedUrl('attachments', attachment.file_url);
                  return { ...attachment, signed_url: signedUrl };
                }
                return attachment;
              })
            );
            return { ...msg, attachments_with_signed_urls: attachmentsWithUrls };
          }
          return msg;
        })
      );
      setMessages(messagesWithSignedUrls);
      setLoading(false);
    }

    fetchInitialMessages();

    // Set up real-time subscription
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `quote_id=eq.${quoteId}` },
        async (payload) => {
          // Fetch the full message data including profile and generate signed URLs for new message
          const newMsgId = payload.new.id;
          const { data: newMessageData, error: fetchError } = await supabase
            .from('messages')
            .select(`*, profiles (full_name, email, role)`)
            .eq('id', newMsgId)
            .single();

          if (fetchError) {
            console.error('Error fetching new message via realtime:', fetchError);
            return;
          }

          if (newMessageData?.attachments && newMessageData.attachments.length > 0) {
            const attachmentsWithUrls = await Promise.all(
                (newMessageData.attachments as any[]).map(async (attachment: any) => {
                if (attachment.file_url) {
                  const { signedUrl } = await getSignedUrl('attachments', attachment.file_url);
                  return { ...attachment, signed_url: signedUrl };
                }
                return attachment;
              })
            );
            setMessages((prev) => [...prev, { ...newMessageData, attachments_with_signed_urls: attachmentsWithUrls }]);
          } else {
            setMessages((prev) => [...prev, newMessageData as MessageWithSender]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [quoteId, channelName, supabase, toast]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newMessageContent.trim() && attachments.length === 0) {
      toast({
        title: 'Empty Message',
        description: 'Please type a message or attach a file.',
        variant: 'destructive',
      });
      return;
    }

    setSending(true);

    const formData = new FormData();
    formData.append('quote_id', quoteId);
    formData.append('content', newMessageContent.trim());
    attachments.forEach((file) => {
      formData.append('attachments', file);
    });

    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        body: formData,
        // Content-Type header is automatically set to multipart/form-data with FormData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send message.');
      }

      setNewMessageContent('');
      setAttachments([]);
      // Realtime subscription will add the new message to the state
      toast({
        title: 'Message Sent',
        description: 'Your message has been sent.',
        variant: 'success',
      });

    } catch (error: any) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error Sending Message',
        description: error.message || 'An unexpected error occurred.',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  const handleAttachmentChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const selectedFiles = Array.from(event.target.files);
      const validFiles: File[] = [];
      selectedFiles.forEach(file => {
        try {
          attachmentFileSchema.parse(file); // Validate each file
          validFiles.push(file);
        } catch (e: any) {
          toast({
            title: `Attachment Rejected: ${file.name}`,
            description: e.errors[0]?.message || 'Invalid file.',
            variant: 'destructive',
          });
        }
      });
      setAttachments(prev => [...prev, ...validFiles]);
    }
  };

  const removeAttachment = (fileToRemove: File) => {
    setAttachments(prev => prev.filter(file => file !== fileToRemove));
  };


  return (
    <Card className="rounded-lg shadow-sm h-full flex flex-col dark:bg-gray-800 dark:border-gray-700">
      <CardHeader className="border-b dark:border-gray-700">
        <CardTitle className="text-xl font-semibold text-gray-900 dark:text-white">
          Quote Chat
        </CardTitle>
      </CardHeader>
      <div ref={chatContainerRef} className="flex-1 p-4 overflow-y-auto space-y-4 bg-gray-50 dark:bg-gray-900/50">
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        ) : (
          messages.length > 0 ? (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex items-start gap-3 ${
                  message.sender_id === currentUserProfile.id ? 'justify-end' : 'justify-start'
                }`}
              >
                {message.sender_id !== currentUserProfile.id && (
                  <UserIcon className="h-8 w-8 rounded-full bg-gray-200 p-1 text-gray-600 dark:bg-gray-700 dark:text-gray-300" />
                )}
                <div
                  className={`flex flex-col max-w-[70%] p-3 rounded-lg shadow-md ${
                    message.sender_id === currentUserProfile.id
                      ? 'bg-blue-600 text-white rounded-br-none'
                      : 'bg-white dark:bg-gray-700 dark:text-gray-100 rounded-bl-none'
                  }`}
                >
                  <p className="font-semibold text-sm mb-1">
                    {message.profiles?.full_name || message.profiles?.email || 'Unknown User'}{' '}
                    <span className="text-xs font-normal opacity-75">({message.profiles?.role})</span>
                  </p>
                  <p className="text-sm break-words">{message.content}</p>
                  {message.attachments_with_signed_urls && message.attachments_with_signed_urls.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {message.attachments_with_signed_urls.map((att, index) => (
                        <a
                          key={index}
                          href={att.signed_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-xs font-medium text-blue-100 dark:text-blue-300 hover:underline"
                        >
                          <Paperclip className="h-4 w-4" />
                          <span>{att.file_name}</span>
                          <DownloadIcon className="h-3 w-3" />
                        </a>
                      ))}
                    </div>
                  )}
                  <p
                    className={`text-xs mt-1 ${
                      message.sender_id === currentUserProfile.id ? 'text-blue-100 opacity-80' : 'text-gray-400 dark:text-gray-300'
                    }`}
                  >
                    {format(new Date(message.created_at || new Date()), 'MMM dd, HH:mm')}
                  </p>
                </div>
                {message.sender_id === currentUserProfile.id && (
                  <UserIcon className="h-8 w-8 rounded-full bg-blue-700 p-1 text-white" />
                )}
              </div>
            ))
          ) : (
            <p className="text-center text-gray-500 dark:text-gray-400">No messages yet. Start the conversation!</p>
          )
        )}
      </div>
      <form onSubmit={handleSendMessage} className="p-4 border-t dark:border-gray-700 flex flex-col gap-2">
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 text-sm text-gray-600 dark:text-gray-400">
            {attachments.map((file, index) => (
              <Badge key={index} variant="secondary" className="flex items-center gap-1">
                {file.name}
                <Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => removeAttachment(file)}>
                  <XCircle className="h-3 w-3 text-red-500" />
                </Button>
              </Badge>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <Input
            type="text"
            placeholder="Type your message..."
            value={newMessageContent}
            onChange={(e) => setNewMessageContent(e.target.value)}
            className="flex-1 rounded-md border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            disabled={sending}
          />
          <label htmlFor="attachment-input" className="cursor-pointer">
            <Button type="button" variant="outline" size="icon" disabled={sending}>
              <Paperclip className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              <span className="sr-only">Attach File</span>
            </Button>
            <input
              id="attachment-input"
              type="file"
              multiple
              onChange={handleAttachmentChange}
              className="hidden"
              disabled={sending}
            />
          </label>
          <Button type="submit" disabled={sending} className="bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800">
            {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            <span className="sr-only">Send Message</span>
          </Button>
        </div>
      </form>
    </Card>
  );
}
