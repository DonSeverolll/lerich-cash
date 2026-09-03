'use client';

import { useMemo, useState } from 'react';
import {
  KeyRound,
  LoaderCircle,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserX,
} from 'lucide-react';
import { toast } from 'sonner';

import type { AppUser, UserPlan, UserRole, UserStatus } from '@/types';

import { formatDate } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';

type RoleFilter = 'TODOS' | UserRole;
type StatusFilter = 'TODOS' | UserStatus;

interface AdminUsersViewProps {
  initialUsers: AppUser[];
  currentUserId: string;
}

export function AdminUsersView({ initialUsers, currentUserId }: AdminUsersViewProps) {
  const [users, setUsers] = useState(initialUsers);
  const [busca, setBusca] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('TODOS');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('TODOS');
  const [pendingId, setPendingId] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<AppUser | null>(null);
  const [resetting, setResetting] = useState<AppUser | null>(null);
  const [removing, setRemoving] = useState<AppUser | null>(null);

  const filtered = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return users.filter((user) => {
      const matchTermo =
        !termo ||
        user.nome.toLowerCase().includes(termo) ||
        user.username.toLowerCase().includes(termo) ||
        user.email.toLowerCase().includes(termo);
      const matchRole = roleFilter === 'TODOS' || user.role === roleFilter;
      const matchStatus = statusFilter === 'TODOS' || user.status === statusFilter;
      return matchTermo && matchRole && matchStatus;
    });
  }, [users, busca, roleFilter, statusFilter]);

  function upsert(user: AppUser) {
    setUsers((current) => {
      const exists = current.some((item) => item.id === user.id);
      return exists ? current.map((item) => (item.id === user.id ? user : item)) : [...current, user];
    });
  }

  async function patchUser(id: string, patch: Record<string, unknown>, successMessage: string) {
    setPendingId(id);
    try {
      const response = await fetch(`/api/admin/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const data = (await response.json()) as { user?: AppUser; error?: string };

      if (!response.ok || !data.user) {
        toast.error(data.error ?? 'Não foi possível atualizar.');
        return false;
      }

      upsert(data.user);
      toast.success(successMessage);
      return true;
    } catch {
      toast.error('Falha de conexão.');
      return false;
    } finally {
      setPendingId(null);
    }
  }

  async function handleDelete(user: AppUser) {
    setPendingId(user.id);
    try {
      const response = await fetch(`/api/admin/users/${user.id}`, { method: 'DELETE' });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        toast.error(data.error ?? 'Não foi possível remover.');
        return;
      }

      setUsers((current) => current.filter((item) => item.id !== user.id));
      toast.success(`${user.username} removido.`);
      setRemoving(null);
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Gestão de usuários</CardTitle>
            <CardDescription>
              {users.length} conta(s) — {users.filter((user) => user.status === 'ATIVO').length} ativa(s)
            </CardDescription>
          </div>
          <Button className="gap-2" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Novo usuário
          </Button>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-col gap-3 md:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-onyx-500" />
              <Input
                value={busca}
                onChange={(event) => setBusca(event.target.value)}
                placeholder="Buscar por nome, usuário ou e-mail"
                className="pl-9"
                aria-label="Buscar usuários"
                data-dica="Buscar usuários"
              />
            </div>
            <Select
              aria-label="Filtrar por perfil"
              data-dica="Filtrar por perfil"
              className="md:w-44"
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value as RoleFilter)}
            >
              <option value="TODOS">Todos os perfis</option>
              <option value="ADMIN">Administradores</option>
              <option value="CLIENTE">Clientes</option>
            </Select>
            <Select
              aria-label="Filtrar por status"
              data-dica="Filtrar por status"
              className="md:w-40"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
            >
              <option value="TODOS">Todos os status</option>
              <option value="ATIVO">Ativos</option>
              <option value="SUSPENSO">Suspensos</option>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-gold-500/15 bg-onyx-950/40 text-xs uppercase tracking-wider text-onyx-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Usuário</th>
                  <th className="px-5 py-3 font-medium">Perfil</th>
                  <th className="px-5 py-3 font-medium">Plano</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Último acesso</th>
                  <th className="px-5 py-3 text-right font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((user) => {
                  const busy = pendingId === user.id;
                  return (
                    <tr key={user.id} className="border-b border-onyx-50/5 last:border-0">
                      <td className="px-5 py-4">
                        <p className="font-medium text-onyx-50">{user.nome}</p>
                        <p className="text-xs text-onyx-500">
                          @{user.username} · {user.email}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        {user.role === 'ADMIN' ? (
                          <Badge tone="gold">
                            <ShieldCheck className="mr-1 h-3 w-3" /> Admin
                          </Badge>
                        ) : (
                          <Badge tone="neutral">Cliente</Badge>
                        )}
                      </td>
                      <td className="px-5 py-4 text-onyx-200">{user.plano}</td>
                      <td className="px-5 py-4">
                        <Badge tone={user.status === 'ATIVO' ? 'success' : 'danger'}>{user.status}</Badge>
                      </td>
                      <td className="px-5 py-4 text-onyx-300">
                        {user.last_login_at ? formatDate(user.last_login_at) : '—'}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-1.5">
                          <IconButton label="Editar" onClick={() => setEditing(user)} disabled={busy}>
                            <Pencil className="h-3.5 w-3.5" />
                          </IconButton>
                          <IconButton label="Redefinir senha" onClick={() => setResetting(user)} disabled={busy}>
                            <KeyRound className="h-3.5 w-3.5" />
                          </IconButton>
                          <IconButton
                            label={user.status === 'ATIVO' ? 'Suspender' : 'Reativar'}
                            disabled={busy || user.id === currentUserId}
                            onClick={() =>
                              patchUser(
                                user.id,
                                { status: user.status === 'ATIVO' ? 'SUSPENSO' : 'ATIVO' },
                                user.status === 'ATIVO' ? 'Usuário suspenso.' : 'Usuário reativado.',
                              )
                            }
                          >
                            {user.status === 'ATIVO' ? (
                              <UserX className="h-3.5 w-3.5" />
                            ) : (
                              <UserCheck className="h-3.5 w-3.5" />
                            )}
                          </IconButton>
                          <IconButton
                            label="Remover"
                            tone="danger"
                            disabled={busy || user.id === currentUserId}
                            onClick={() => setRemoving(user)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </IconButton>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {!filtered.length ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-sm text-onyx-500">
                      Nenhum usuário encontrado com os filtros atuais.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <CreateUserDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={upsert} />

      <EditUserDialog
        user={editing}
        onOpenChange={(open) => !open && setEditing(null)}
        onSave={async (patch) => {
          if (!editing) return false;
          const ok = await patchUser(editing.id, patch, 'Usuário atualizado.');
          if (ok) setEditing(null);
          return ok;
        }}
      />

      <ResetPasswordDialog
        user={resetting}
        onOpenChange={(open) => !open && setResetting(null)}
        onSave={async (password) => {
          if (!resetting) return false;
          const ok = await patchUser(resetting.id, { password }, 'Senha redefinida.');
          if (ok) setResetting(null);
          return ok;
        }}
      />

      <Dialog open={Boolean(removing)} onOpenChange={(open) => !open && setRemoving(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Remover usuário</DialogTitle>
            <DialogDescription>
              A conta <strong className="text-onyx-100">@{removing?.username}</strong> será apagada. Esta ação
              não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="subtle" onClick={() => setRemoving(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={pendingId === removing?.id}
              onClick={() => removing && handleDelete(removing)}
            >
              {pendingId === removing?.id ? 'Removendo…' : 'Remover definitivamente'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function IconButton({
  children,
  label,
  tone = 'neutral',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string; tone?: 'neutral' | 'danger' }) {
  return (
    <button
      type="button"
      aria-label={label}
      data-dica={label}
      className={
        tone === 'danger'
          ? 'rounded-lg border border-rose-500/25 p-2 text-rose-300 transition hover:bg-rose-500/15 disabled:opacity-40'
          : 'rounded-lg border border-gold-500/20 p-2 text-onyx-300 transition hover:border-gold-500/50 hover:text-gold-200 disabled:opacity-40'
      }
      {...props}
    >
      {children}
    </button>
  );
}

/* ---------- Criação ---------- */

function CreateUserDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (user: AppUser) => void;
}) {
  const [pending, setPending] = useState(false);
  const [form, setForm] = useState({
    nome: '',
    username: '',
    email: '',
    password: '',
    role: 'CLIENTE' as UserRole,
    plano: 'FREE' as UserPlan,
  });

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);

    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = (await response.json()) as { user?: AppUser; error?: string };

      if (!response.ok || !data.user) {
        toast.error(data.error ?? 'Não foi possível criar o usuário.');
        return;
      }

      onCreated(data.user);
      toast.success(`${data.user.username} criado.`);
      setForm({ nome: '', username: '', email: '', password: '', role: 'CLIENTE', plano: 'FREE' });
      onOpenChange(false);
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo usuário</DialogTitle>
          <DialogDescription>Crie um acesso de cliente ou administrador.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="novo-nome">Nome completo</Label>
            <Input
              id="novo-nome"
              required
              minLength={2}
              value={form.nome}
              onChange={(event) => setForm({ ...form, nome: event.target.value })}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="novo-username">Usuário</Label>
              <Input
                id="novo-username"
                required
                minLength={3}
                pattern="[a-zA-Z0-9._\-]+"
                value={form.username}
                onChange={(event) => setForm({ ...form, username: event.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="novo-email">E-mail</Label>
              <Input
                id="novo-email"
                type="email"
                required
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="nova-senha">Senha provisória</Label>
            <Input
              id="nova-senha"
              type="text"
              required
              minLength={8}
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
              placeholder="Mínimo de 8 caracteres"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="novo-role">Perfil</Label>
              <Select
                id="novo-role"
                value={form.role}
                onChange={(event) => setForm({ ...form, role: event.target.value as UserRole })}
              >
                <option value="CLIENTE">Cliente</option>
                <option value="ADMIN">Administrador</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="novo-plano">Plano</Label>
              <Select
                id="novo-plano"
                value={form.plano}
                onChange={(event) => setForm({ ...form, plano: event.target.value as UserPlan })}
              >
                <option value="FREE">Free</option>
                <option value="PRO">Pro</option>
                <option value="PREMIUM">Premium</option>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="subtle" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending} className="gap-2">
              {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Criar usuário
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- Edição ---------- */

function EditUserDialog({
  user,
  onOpenChange,
  onSave,
}: {
  user: AppUser | null;
  onOpenChange: (open: boolean) => void;
  onSave: (patch: Record<string, unknown>) => Promise<boolean>;
}) {
  const [pending, setPending] = useState(false);

  return (
    <Dialog open={Boolean(user)} onOpenChange={onOpenChange}>
      <DialogContent>
        {user ? (
          <>
            <DialogHeader>
              <DialogTitle>Editar @{user.username}</DialogTitle>
              <DialogDescription>Atualize dados cadastrais, perfil e plano.</DialogDescription>
            </DialogHeader>

            <form
              key={user.id}
              onSubmit={async (event) => {
                event.preventDefault();
                const data = new FormData(event.currentTarget);
                setPending(true);
                await onSave({
                  nome: String(data.get('nome')),
                  email: String(data.get('email')),
                  role: data.get('role'),
                  plano: data.get('plano'),
                  status: data.get('status'),
                });
                setPending(false);
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="edit-nome">Nome completo</Label>
                <Input id="edit-nome" name="nome" required defaultValue={user.nome} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-email">E-mail</Label>
                <Input id="edit-email" name="email" type="email" required defaultValue={user.email} />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="edit-role">Perfil</Label>
                  <Select id="edit-role" name="role" defaultValue={user.role}>
                    <option value="CLIENTE">Cliente</option>
                    <option value="ADMIN">Administrador</option>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-plano">Plano</Label>
                  <Select id="edit-plano" name="plano" defaultValue={user.plano}>
                    <option value="FREE">Free</option>
                    <option value="PRO">Pro</option>
                    <option value="PREMIUM">Premium</option>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-status">Status</Label>
                  <Select id="edit-status" name="status" defaultValue={user.status}>
                    <option value="ATIVO">Ativo</option>
                    <option value="SUSPENSO">Suspenso</option>
                  </Select>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="subtle" onClick={() => onOpenChange(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={pending}>
                  {pending ? 'Salvando…' : 'Salvar alterações'}
                </Button>
              </DialogFooter>
            </form>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

/* ---------- Redefinição de senha ---------- */

function ResetPasswordDialog({
  user,
  onOpenChange,
  onSave,
}: {
  user: AppUser | null;
  onOpenChange: (open: boolean) => void;
  onSave: (password: string) => Promise<boolean>;
}) {
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);

  return (
    <Dialog
      open={Boolean(user)}
      onOpenChange={(open) => {
        if (!open) setPassword('');
        onOpenChange(open);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Redefinir senha</DialogTitle>
          <DialogDescription>
            Defina uma senha provisória para <strong className="text-onyx-100">@{user?.username}</strong>.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={async (event) => {
            event.preventDefault();
            setPending(true);
            const ok = await onSave(password);
            setPending(false);
            if (ok) setPassword('');
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="reset-senha">Nova senha</Label>
            <Input
              id="reset-senha"
              required
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Mínimo de 8 caracteres"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="subtle" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending} className="gap-2">
              <KeyRound className="h-4 w-4" />
              {pending ? 'Aplicando…' : 'Redefinir'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
