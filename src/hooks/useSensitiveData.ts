import { useUserRole } from "./useUserRole";

export function useSensitiveData() {
  const { isAdmin } = useUserRole();

  const mask = (value: string | undefined | null, visibleChars = 3): string => {
    if (!value) return "—";
    if (isAdmin) return value;
    if (value.length <= visibleChars) return "•".repeat(value.length);
    return value.slice(0, visibleChars) + "•".repeat(Math.min(value.length - visibleChars, 8));
  };

  const maskCpf = (cpf: string | undefined | null): string => {
    if (!cpf) return "—";
    if (isAdmin) return cpf;
    return "•••.•••.•••-••";
  };

  const maskPhone = (phone: string | undefined | null): string => {
    if (!phone) return "—";
    if (isAdmin) return phone;
    const clean = phone.replace(/\D/g, "");
    if (clean.length >= 4) {
      return phone.slice(0, -4).replace(/\d/g, "•") + phone.slice(-4);
    }
    return "•".repeat(phone.length);
  };

  const maskEmail = (email: string | undefined | null): string => {
    if (!email) return "—";
    if (isAdmin) return email;
    const [local, domain] = email.split("@");
    if (!domain) return "•".repeat(email.length);
    return local.slice(0, 2) + "•".repeat(Math.min(local.length - 2, 6)) + "@" + domain;
  };

  const maskAddress = (addr: string | undefined | null): string => {
    if (!addr) return "—";
    if (isAdmin) return addr;
    return "••••••••••";
  };

  return { isAdmin, mask, maskCpf, maskPhone, maskEmail, maskAddress, canSeeSensitive: isAdmin };
}
