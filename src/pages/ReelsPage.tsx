import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { Plus, Loader2, Trash2, Send, MessageCircle, Image, Video, Camera as CameraIcon, User } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ReelPost {
  id: string;
  user_id: string;
  user_name: string;
  media_url: string;
  media_type: string;
  caption: string;
  created_at: string;
}

interface ReelComment {
  id: string;
  post_id: string;
  user_id: string;
  user_name: string;
  content: string;
  created_at: string;
}

const ReelsPage: React.FC = () => {
  const { session } = useAuth();
  const { isAdmin } = useUserRole();
  const [posts, setPosts] = useState<ReelPost[]>([]);
  const [comments, setComments] = useState<ReelComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [commentText, setCommentText] = useState<Record<string, string>>({});
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [sendingComment, setSendingComment] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraFileRef = useRef<HTMLInputElement>(null);

  const fetchPosts = useCallback(async () => {
    const { data } = await supabase
      .from('reels_posts')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setPosts(data as ReelPost[]);
  }, []);

  const fetchComments = useCallback(async () => {
    const { data } = await supabase
      .from('reels_comments')
      .select('*')
      .order('created_at', { ascending: true });
    if (data) setComments(data as ReelComment[]);
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchPosts(), fetchComments()]);
      setLoading(false);
    };
    load();

    const channel = supabase
      .channel('reels-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reels_posts' }, fetchPosts)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reels_comments' }, fetchComments)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchPosts, fetchComments]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) { toast.error('Arquivo muito grande (máx 50MB)'); return; }
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handlePost = async () => {
    if (!selectedFile || !session?.user) return;
    setUploading(true);
    try {
      const ext = selectedFile.name.split('.').pop();
      const path = `${session.user.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('reels').upload(path, selectedFile);
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from('reels').getPublicUrl(path);
      const mediaType = selectedFile.type.startsWith('video') ? 'video' : 'image';

      const { error } = await supabase.from('reels_posts').insert({
        user_id: session.user.id,
        user_name: session.user.user_metadata?.full_name || session.user.email || 'Anônimo',
        media_url: urlData.publicUrl,
        media_type: mediaType,
        caption,
      });
      if (error) throw error;
      toast.success('Post publicado! 🎉');
      setCaption('');
      setSelectedFile(null);
      setPreviewUrl(null);
      setDialogOpen(false);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao publicar');
    } finally {
      setUploading(false);
    }
  };

  const handleDeletePost = async (postId: string) => {
    const { error } = await supabase.from('reels_posts').delete().eq('id', postId);
    if (error) toast.error('Erro ao excluir post');
    else toast.success('Post excluído');
  };

  const handleComment = async (postId: string) => {
    const text = commentText[postId]?.trim();
    if (!text || !session?.user) return;
    setSendingComment(postId);
    const { error } = await supabase.from('reels_comments').insert({
      post_id: postId,
      user_id: session.user.id,
      user_name: session.user.user_metadata?.full_name || session.user.email || 'Anônimo',
      content: text,
    });
    if (error) toast.error('Erro ao comentar');
    else {
      setCommentText(prev => ({ ...prev, [postId]: '' }));
    }
    setSendingComment(null);
  };

  const handleDeleteComment = async (commentId: string) => {
    await supabase.from('reels_comments').delete().eq('id', commentId);
  };

  const getCommentsForPost = (postId: string) => comments.filter(c => c.post_id === postId);

  return (
    <div className="min-h-screen bg-background">
      <div className="container px-3 sm:px-4 md:px-6 py-4 sm:py-6 max-w-2xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground">Mural da Equipe</h1>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5">
                <Plus size={16} /> Publicar
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nova Publicação</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <input
                  ref={cameraFileRef}
                  type="file"
                  accept="image/*,video/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleFileSelect}
                />
                {!previewUrl ? (
                  <div className="flex gap-3">
                    <div
                      onClick={() => cameraFileRef.current?.click()}
                      className="flex-1 border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                    >
                      <CameraIcon size={24} className="mx-auto mb-1.5 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">Câmera</p>
                    </div>
                    <div
                      onClick={() => fileRef.current?.click()}
                      className="flex-1 border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                    >
                      <div className="flex justify-center gap-2 mb-1.5">
                        <Image size={20} className="text-muted-foreground" />
                        <Video size={20} className="text-muted-foreground" />
                      </div>
                      <p className="text-xs text-muted-foreground">Galeria</p>
                    </div>
                  </div>
                ) : (
                  <div className="relative rounded-xl overflow-hidden">
                    {selectedFile?.type.startsWith('video') ? (
                      <video src={previewUrl} controls className="w-full max-h-[300px] object-contain bg-black rounded-xl" />
                    ) : (
                      <img src={previewUrl} alt="Preview" className="w-full max-h-[300px] object-contain bg-muted rounded-xl" />
                    )}
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 h-7 w-7"
                      onClick={() => { setSelectedFile(null); setPreviewUrl(null); }}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                )}
                <Textarea
                  placeholder="Escreva uma legenda..."
                  value={caption}
                  onChange={e => setCaption(e.target.value)}
                  className="min-h-[60px]"
                />
              </div>
              <DialogFooter>
                <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
                <Button onClick={handlePost} disabled={!selectedFile || uploading}>
                  {uploading ? <Loader2 className="animate-spin w-4 h-4" /> : 'Publicar'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin text-muted-foreground" /></div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <CameraIcon size={48} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">Nenhuma publicação ainda</p>
            <p className="text-xs mt-1">Seja o primeiro a postar!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map(post => {
              const postComments = getCommentsForPost(post.id);
              const isExpanded = expandedComments.has(post.id);
              const canDelete = post.user_id === session?.user?.id || isAdmin;

              return (
                <Card key={post.id} className="overflow-hidden">
                  {/* Header */}
                  <div className="flex items-center justify-between px-3 py-2 border-b border-border">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <User size={16} className="text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{post.user_name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {format(new Date(post.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                    {canDelete && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeletePost(post.id)}>
                        <Trash2 size={14} />
                      </Button>
                    )}
                  </div>

                  {/* Media */}
                  {post.media_type === 'video' ? (
                    <video src={post.media_url} controls className="w-full max-h-[400px] object-contain bg-black" />
                  ) : (
                    <img src={post.media_url} alt="" className="w-full max-h-[400px] object-contain bg-muted" />
                  )}

                  <CardContent className="p-3 space-y-2">
                    {post.caption && (
                      <p className="text-sm text-foreground">
                        <span className="font-semibold">{post.user_name}</span>{' '}
                        {post.caption}
                      </p>
                    )}

                    {/* Comments toggle */}
                    <button
                      onClick={() => setExpandedComments(prev => {
                        const next = new Set(prev);
                        next.has(post.id) ? next.delete(post.id) : next.add(post.id);
                        return next;
                      })}
                      className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                    >
                      <MessageCircle size={14} />
                      {postComments.length > 0 ? `${postComments.length} comentário(s)` : 'Comentar'}
                    </button>

                    {/* Comments */}
                    {isExpanded && (
                      <div className="space-y-2 pt-1">
                        {postComments.map(comment => (
                          <div key={comment.id} className="flex items-start gap-2 text-xs">
                            <div className="flex-1 min-w-0">
                              <span className="font-semibold text-foreground">{comment.user_name}</span>{' '}
                              <span className="text-muted-foreground">{comment.content}</span>
                              <span className="text-[9px] text-muted-foreground/60 ml-1">
                                {format(new Date(comment.created_at), 'HH:mm')}
                              </span>
                            </div>
                            {(comment.user_id === session?.user?.id || isAdmin) && (
                              <button onClick={() => handleDeleteComment(comment.id)} className="text-destructive/60 hover:text-destructive shrink-0">
                                <Trash2 size={10} />
                              </button>
                            )}
                          </div>
                        ))}
                        <div className="flex gap-2">
                          <Input
                            placeholder="Comentar..."
                            value={commentText[post.id] || ''}
                            onChange={e => setCommentText(prev => ({ ...prev, [post.id]: e.target.value }))}
                            onKeyDown={e => e.key === 'Enter' && handleComment(post.id)}
                            className="h-8 text-xs"
                          />
                          <Button
                            size="icon"
                            className="h-8 w-8 shrink-0"
                            onClick={() => handleComment(post.id)}
                            disabled={sendingComment === post.id}
                          >
                            {sendingComment === post.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send size={14} />}
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ReelsPage;
