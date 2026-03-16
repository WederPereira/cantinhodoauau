import React, { useState, useEffect } from 'react';
import { useAuth, AppRole } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Users, Shield, Moon, Eye, Pencil, Camera } from 'lucide-react';
import { toast } from 'sonner';

interface TeamMember {
  id: string;
  full_name: string;
  avatar_url: string | null;
  cargo: AppRole;
  roles: AppRole[];
}

const CARGO_LABELS: Record<AppRole, string> = {
  admin: 'Administrador',
  noturnista: 'Noturnista',
  monitor: 'Monitor',
};

const CARGO_ICONS: Record<AppRole, React.ReactNode> = {
  admin: <Shield size={14} />,
  noturnista: <Moon size={14} />,
  monitor: <Eye size={14} />,
};

const CARGO_COLORS: Record<AppRole, string> = {
  admin: 'bg-destructive/10 text-destructive border-destructive/20',
  noturnista: 'bg-primary/10 text-primary border-primary/20',
  monitor: 'bg-accent/10 text-accent-foreground border-accent/20',
};

const TeamPage: React.FC = () => {
  const { isAdmin, logAction } = useAuth();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const fetchMembers = async () => {
    setLoading(true);
    const { data: profiles } = await (supabase.from('profiles') as any)
      .select('*')
      .order('full_name');

    if (profiles) {
      const membersWithRoles: TeamMember[] = [];
      for (const p of profiles) {
        const { data: rolesData } = await (supabase.from('user_roles') as any)
          .select('role')
          .eq('user_id', p.id);

        membersWithRoles.push({
          id: p.id,
          full_name: p.full_name,
          avatar_url: p.avatar_url,
          cargo: p.cargo as AppRole,
          roles: rolesData?.map((r: any) => r.role as AppRole) || [],
        });
      }
      setMembers(membersWithRoles);
    }
    setLoading(false);
  };

  useEffect(() => { fetchMembers(); }, []);

  const handleUpdateRole = async (memberId: string, newCargo: AppRole) => {
    await (supabase.from('profiles') as any).update({ cargo: newCargo, updated_at: new Date().toISOString() }).eq('id', memberId);
    await (supabase.from('user_roles') as any).delete().eq('user_id', memberId);
    await (supabase.from('user_roles') as any).insert({ user_id: memberId, role: newCargo });
    
    await logAction('update_role', 'profile', memberId, { new_cargo: newCargo });
    toast.success('Cargo atualizado!');
    fetchMembers();
    setEditDialogOpen(false);
  };

  const handleUploadAvatar = async (memberId: string, file: File) => {
    const ext = file.name.split('.').pop();
    const path = `${memberId}.${ext}`;
    
    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
    if (error) { toast.error('Erro ao enviar foto'); return; }

    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
    await (supabase.from('profiles') as any).update({ avatar_url: publicUrl, updated_at: new Date().toISOString() }).eq('id', memberId);
    
    toast.success('Foto atualizada!');
    fetchMembers();
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container px-4 py-6 max-w-2xl mx-auto space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Equipe</h1>
            <p className="text-sm text-muted-foreground">{members.length} membros</p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Carregando...</div>
        ) : members.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">Nenhum membro cadastrado ainda.</p>
              <p className="text-sm text-muted-foreground mt-1">Cadastre o primeiro usuário na aba de login.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {members.map(member => (
              <Card key={member.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <Avatar className="h-14 w-14 border-2 border-border">
                        <AvatarImage src={member.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary font-bold text-lg">
                          {member.full_name.charAt(0).toUpperCase() || '?'}
                        </AvatarFallback>
                      </Avatar>
                      {isAdmin && (
                        <label className="absolute -bottom-1 -right-1 p-1 bg-primary rounded-full cursor-pointer hover:bg-primary/90 transition-colors">
                          <Camera size={12} className="text-primary-foreground" />
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={e => {
                              const file = e.target.files?.[0];
                              if (file) handleUploadAvatar(member.id, file);
                            }}
                          />
                        </label>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground truncate">{member.full_name || 'Sem nome'}</p>
                      <Badge variant="outline" className={`${CARGO_COLORS[member.cargo]} gap-1 mt-1`}>
                        {CARGO_ICONS[member.cargo]}
                        {CARGO_LABELS[member.cargo]}
                      </Badge>
                    </div>

                    {isAdmin && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => { setEditingMember(member); setEditDialogOpen(true); }}
                      >
                        <Pencil size={16} />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar membro</DialogTitle>
            </DialogHeader>
            {editingMember && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={editingMember.avatar_url || undefined} />
                    <AvatarFallback>{editingMember.full_name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <p className="font-semibold">{editingMember.full_name}</p>
                </div>
                <div className="space-y-2">
                  <Label>Cargo</Label>
                  <Select
                    value={editingMember.cargo}
                    onValueChange={v => handleUpdateRole(editingMember.id, v as AppRole)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">🛡️ Administrador</SelectItem>
                      <SelectItem value="noturnista">🌙 Noturnista</SelectItem>
                      <SelectItem value="monitor">👁️ Monitor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default TeamPage;
