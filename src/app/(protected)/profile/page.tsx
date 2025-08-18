import { redirect } from "next/navigation";
import { getCurrentUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

import ProfileClient from "./profile-client";

/* ----------------------------- SERVER ACTIONS ----------------------------- */
type ActionState = { ok: boolean; msg: string };
async function updateProfile(prevState: ActionState, formData: FormData) {
  "use server";
  const me = await getCurrentUser();
  if (!me?.email) redirect("/login");

  const displayName = String(formData.get("displayName") ?? "").trim();
  if (!displayName) {
    return { ok: false, msg: "El nombre no puede estar vacío." };
  }

  await prisma.userProfile.update({
    where: { email: me.email },
    data: { displayName },
  });

  revalidatePath("/profile");
  return { ok: true, msg: "Perfil actualizado." };
}

async function changePassword(prevState: ActionState, formData: FormData) {
  "use server";
  const me = await getCurrentUser();
  if (!me?.email) redirect("/login");

  const current = String(formData.get("currentPassword") ?? "");
  const next = String(formData.get("newPassword") ?? "");
  const confirm = String(formData.get("confirmPassword") ?? "");

  // reglas mínimas
  if (next.length < 8) return { ok: false, msg: "La nueva contraseña debe tener al menos 8 caracteres." };
  if (next !== confirm) return { ok: false, msg: "La confirmación no coincide." };

  const profile = await prisma.userProfile.findUnique({ where: { email: me.email } });
  if (!profile) return { ok: false, msg: "Perfil no encontrado." };

  // Si ya existe passwordHash, verificamos la actual
  if (profile.passwordHash) {
    const valid = await bcrypt.compare(current, profile.passwordHash);
    if (!valid) return { ok: false, msg: "La contraseña actual es incorrecta." };
  } else {
    // si no hay password previa, exigimos que current esté vacío para evitar confusiones
    if (current) return { ok: false, msg: "No existe contraseña previa. Deja el campo actual vacío." };
  }

  const hash = await bcrypt.hash(next, 12);
  await prisma.userProfile.update({
    where: { email: me.email },
    data: { passwordHash: hash },
  });

  revalidatePath("/profile");
  return { ok: true, msg: "Contraseña actualizada." };
}

/* ------------------------------- PAGE (UI) -------------------------------- */

export default async function ProfilePage() {
  const me = await getCurrentUser();
  if (!me?.email) redirect("/login");

  // Tomamos datos del perfil de dominio
  const profile = await prisma.userProfile.findUnique({
    where: { email: me.email },
    select: { displayName: true, email: true, passwordHash: true },
  });

  // Pasamos datos y las acciones servidor al componente cliente
  return <ProfileClient me={me} profile={profile} updateProfile={updateProfile} changePassword={changePassword} />;
}
