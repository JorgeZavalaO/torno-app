"use client";

import * as React from "react";
import { useFormStatus } from "react-dom"; // <- este sí se mantiene
import { CheckCircle2, KeyRound, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

type Me = { email?: string | null; name?: string | null };
type Profile = { displayName?: string | null; email?: string | null; passwordHash?: string | null } | null;
type ActionState = { ok: boolean; msg: string };
type ServerAction = (prev: ActionState, formData: FormData) => Promise<ActionState>;

function SubmitButton({ children, className }: { children: React.ReactNode; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className={cn(className)}>
      {pending ? "Guardando..." : children}
    </Button>
  );
}

export default function ProfileClient({
  me,
  profile,
  updateProfile,
  changePassword,
}: {
  me: Me;
  profile: Profile;
  updateProfile: ServerAction;
  changePassword: ServerAction;
}) {
  // ⬇⬇ Reemplaza useFormState por React.useActionState
  const [profileState, profileAction] = React.useActionState<ActionState, FormData>(
    updateProfile,
    { ok: false, msg: "" }
  );
  const [pwdState, pwdAction] = React.useActionState<ActionState, FormData>(
    changePassword,
    { ok: false, msg: "" }
  );

  return (
    <div className="mx-auto w-full max-w-3xl p-4 sm:p-6">
      <h1 className="text-2xl font-semibold mb-2">Perfil</h1>
      <p className="text-sm text-muted-foreground mb-6">Gestiona tu información personal y credenciales de acceso.</p>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserIcon className="h-5 w-5" />
            Información del perfil
          </CardTitle>
          <CardDescription>Actualiza tu nombre visible. Tu correo no puede modificarse desde aquí.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={profileAction} className="grid gap-4">
            <div className="grid gap-2">
              <Label>Nombre</Label>
              <Input name="displayName" defaultValue={(profile?.displayName ?? me.name ?? "") as string} placeholder="Tu nombre" required />
            </div>

            <div className="grid gap-2">
              <Label>Correo</Label>
              <Input defaultValue={(profile?.email ?? me.email ?? "") as string} disabled />
            </div>

            {profileState.msg ? (
              <p className={cn("text-sm", profileState.ok ? "text-green-600" : "text-red-600")}>
                {profileState.ok ? "✅ " : "⚠️ "}
                {String(profileState.msg)}
              </p>
            ) : null}

            <div className="flex justify-end">
              <SubmitButton>Guardar cambios</SubmitButton>
            </div>
          </form>
        </CardContent>
      </Card>

      <Separator className="mb-6" />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            Cambiar contraseña
          </CardTitle>
          <CardDescription>
            {profile?.passwordHash ? "Ingresa tu contraseña actual y define una nueva." : "Aún no tienes contraseña establecida (solo OAuth). Puedes crear una ahora."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={pwdAction} className="grid gap-4">
            <div className="grid gap-2">
              <Label>Contraseña actual {profile?.passwordHash ? "" : "(no requerida)"}</Label>
              <Input name="currentPassword" type="password" placeholder={profile?.passwordHash ? "********" : "Deja vacío"} />
            </div>

            <div className="grid gap-2">
              <Label>Nueva contraseña</Label>
              <Input name="newPassword" type="password" placeholder="Mínimo 8 caracteres" required />
            </div>

            <div className="grid gap-2">
              <Label>Confirmar nueva contraseña</Label>
              <Input name="confirmPassword" type="password" placeholder="Repite la nueva contraseña" required />
            </div>

            {pwdState.msg ? (
              <p className={cn("text-sm", pwdState.ok ? "text-green-600" : "text-red-600")}>
                {pwdState.ok ? "✅ " : "⚠️ "}
                {String(pwdState.msg)}
              </p>
            ) : null}

            <div className="flex justify-end">
              <SubmitButton>Actualizar contraseña</SubmitButton>
            </div>
          </form>
        </CardContent>
        {pwdState.ok ? (
          <CardFooter>
            <div className="flex items-center gap-2 text-green-600 text-sm">
              <CheckCircle2 className="h-4 w-4" />
              Contraseña actualizada correctamente.
            </div>
          </CardFooter>
        ) : null}
      </Card>
    </div>
  );
}
