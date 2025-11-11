import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useConversations } from '@/hooks/useConversations';
import { useMessages } from '@/hooks/useMessages';
import { MessageInput } from '@/components/MessageInput';
import { ArrowLeft, MessageSquare, Phone, FileText, Image as ImageIcon, Download } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';

const Messages = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { conversations, loading: conversationsLoading } = useConversations();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(
    searchParams.get('conversation') || null
  );
  const { messages, loading: messagesLoading, sendMessage, markAsRead } = useMessages(selectedConversationId);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    fetchUser();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (selectedConversationId) {
      markAsRead();
    }
  }, [selectedConversationId, markAsRead]);

  // Setup typing indicator with Supabase Realtime Presence
  useEffect(() => {
    if (!selectedConversationId || !currentUserId) return;

    const channel = supabase.channel(`typing-${selectedConversationId}`);

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const typing = new Set<string>();
        
        Object.values(state).forEach((presences: any) => {
          presences.forEach((presence: any) => {
            if (presence.user_id !== currentUserId && presence.typing) {
              typing.add(presence.user_id);
            }
          });
        });
        
        setTypingUsers(typing);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ user_id: currentUserId, typing: false });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedConversationId, currentUserId]);

  const handleTyping = async () => {
    if (!selectedConversationId || !currentUserId) return;

    const channel = supabase.channel(`typing-${selectedConversationId}`);
    await channel.track({ user_id: currentUserId, typing: true });

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Stop typing after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(async () => {
      await channel.track({ user_id: currentUserId, typing: false });
    }, 2000);
  };

  const selectedConversation = conversations.find(c => c.id === selectedConversationId);

  if (conversationsLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-3xl font-bold">Messagerie</h1>
          </div>
          <div className="text-center text-muted-foreground">Chargement...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-3xl font-bold">Messagerie</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Conversations List */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Conversations</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[600px]">
                {conversations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-8 text-muted-foreground">
                    <MessageSquare className="h-12 w-12 mb-2" />
                    <p className="text-center">Aucune conversation</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {conversations.map((conv) => (
                      <button
                        key={conv.id}
                        onClick={() => setSelectedConversationId(conv.id)}
                        className={`w-full text-left p-4 hover:bg-accent transition-colors ${
                          selectedConversationId === conv.id ? 'bg-accent' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between mb-1">
                          <p className="font-semibold text-sm">{conv.other_user_name}</p>
                          {conv.unread_count! > 0 && (
                            <Badge variant="destructive" className="text-xs">
                              {conv.unread_count}
                            </Badge>
                          )}
                        </div>
                        {conv.other_user_phone && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                            <Phone className="h-3 w-3" />
                            <span>{conv.other_user_phone}</span>
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground mb-1">{conv.property_title}</p>
                        {conv.dernier_message && (
                          <p className="text-xs text-muted-foreground truncate">
                            {conv.dernier_message}
                          </p>
                        )}
                        {conv.dernier_message_date && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(conv.dernier_message_date), 'Pp', { locale: fr })}
                          </p>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Messages Area */}
          <Card className="lg:col-span-2">
            {selectedConversation ? (
              <>
                <CardHeader>
                  <CardTitle>{selectedConversation.other_user_name}</CardTitle>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{selectedConversation.property_title}</span>
                    {selectedConversation.other_user_phone && (
                      <div className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        <span>{selectedConversation.other_user_phone}</span>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col h-[600px]">
                  <ScrollArea className="flex-1 pr-4 mb-4">
                    {messagesLoading ? (
                      <div className="text-center text-muted-foreground py-8">
                        Chargement des messages...
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="text-center text-muted-foreground py-8">
                        Aucun message. Commencez la conversation !
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {messages.map((message) => {
                          const isCurrentUser = message.sender_id === currentUserId;
                          const hasFile = message.file_url;
                          const isImage = message.file_type?.startsWith('image/');

                          return (
                            <div
                              key={message.id}
                              className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                            >
                              <div
                                className={`max-w-[70%] rounded-lg p-3 ${
                                  isCurrentUser
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted'
                                }`}
                              >
                                <p className="text-xs font-semibold mb-1">
                                  {message.sender_name}
                                </p>
                                
                                {hasFile && (
                                  <div className="mb-2">
                                    {isImage ? (
                                      <img 
                                        src={message.file_url} 
                                        alt={message.file_name}
                                        className="rounded max-w-full h-auto max-h-64 object-cover cursor-pointer"
                                        onClick={() => window.open(message.file_url, '_blank')}
                                      />
                                    ) : (
                                      <a
                                        href={message.file_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 p-2 bg-background/20 rounded hover:bg-background/30 transition-colors"
                                      >
                                        <FileText className="h-4 w-4" />
                                        <span className="text-xs flex-1 truncate">
                                          {message.file_name}
                                        </span>
                                        <Download className="h-4 w-4" />
                                      </a>
                                    )}
                                  </div>
                                )}
                                
                                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                                
                                <div className="flex items-center justify-between mt-1">
                                  <p className="text-xs opacity-70">
                                    {format(new Date(message.created_at), 'p', { locale: fr })}
                                  </p>
                                  {isCurrentUser && message.lu && (
                                    <span className="text-xs opacity-70">✓✓ Lu</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        
                        {typingUsers.size > 0 && (
                          <div className="flex justify-start">
                            <div className="bg-muted rounded-lg px-4 py-2">
                              <div className="flex gap-1">
                                <span className="w-2 h-2 bg-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                <span className="w-2 h-2 bg-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                <span className="w-2 h-2 bg-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                              </div>
                            </div>
                          </div>
                        )}
                        
                        <div ref={messagesEndRef} />
                      </div>
                    )}
                  </ScrollArea>

                  <MessageInput
                    conversationId={selectedConversationId}
                    onSend={sendMessage}
                    onTyping={handleTyping}
                  />
                </CardContent>
              </>
            ) : (
              <CardContent className="flex items-center justify-center h-[600px]">
                <div className="text-center text-muted-foreground">
                  <MessageSquare className="h-16 w-16 mx-auto mb-4" />
                  <p>Sélectionnez une conversation pour commencer</p>
                </div>
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Messages;
