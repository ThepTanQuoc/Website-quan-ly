import { useState, useEffect, type ReactNode } from "react";
import { Lock, ShieldCheck, Eye, EyeOff } from "lucide-react";

const DIRECTOR_PASSWORD = "tanquoc12345!";
const FLAG = "tq_dir_auth";

export function isDirectorAuthed(): boolean {
  try {
    return sessionStorage.getItem(FLAG) === "1";
  } catch {
    return false;
  }
}
export function lockDirector() {
  try {
    sessionStorage.removeItem(FLAG);
  } catch {
    /* bỏ qua */
  }
  window.dispatchEvent(new CustomEvent("tq-dir-lock"));
}

export default function PasswordGate({ children }: { children: ReactNode }) {
  const [authed, setAuthed] = useState(isDirectorAuthed());
  const [pw, setPw] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState(false);

  useEffect(() => {
    const relock = () => setAuthed(false);
    window.addEventListener("tq-dir-lock", relock);
    return () => window.removeEventListener("tq-dir-lock", relock);
  }, []);

  if (authed) return <>{children}</>;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pw === DIRECTOR_PASSWORD) {
      try {
        sessionStorage.setItem(FLAG, "1");
      } catch {
        /* bỏ qua */
      }
      setAuthed(true);
    } else {
      setErr(true);
    }
  };

  return (
    <div className="grid min-h-[70vh] place-items-center px-4">
      <div className="glass w-full max-w-md p-8 text-center">
        <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl grad-cyan shadow-glow-cyan">
          <Lock size={28} className="text-white" />
        </div>
        <h2 className="font-display text-xl font-extrabold text-navy-950">Báo cáo Giám đốc</h2>
        <p className="mt-1 text-sm text-slate-500">
          Khu vực bảo mật — chứa doanh thu, công nợ và <b>lợi nhuận</b>. Nhập mật khẩu để xem.
        </p>
        <form onSubmit={submit} className="mt-5">
          <div className="relative">
            <input
              autoFocus
              type={show ? "text" : "password"}
              value={pw}
              onChange={(e) => {
                setPw(e.target.value);
                setErr(false);
              }}
              placeholder="Mật khẩu"
              className={`w-full rounded-xl border px-4 py-3 pr-11 text-sm focus:outline-none ${
                err ? "border-rose-400 bg-rose-50" : "border-slate-200 focus:border-cyan-400"
              }`}
            />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {show ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {err && <p className="mt-2 text-sm font-semibold text-rose-500">Sai mật khẩu, thử lại.</p>}
          <button type="submit" className="btn-primary mt-4 w-full">
            <ShieldCheck size={16} /> Mở khoá
          </button>
        </form>
        <p className="mt-4 text-[11px] text-slate-400">
          Phiên đăng nhập tự thoát khi đóng trình duyệt.
        </p>
      </div>
    </div>
  );
}
