import { useEffect } from "react";
import { CalendarDays, Mail, MapPin, Phone, ShieldCheck, UserRound, X } from "lucide-react";

const firstValue = (...values) =>
  values.find(
    (value) =>
      value !== null &&
      value !== undefined &&
      String(value).trim() !== ""
  );

function UserDetailsModal({ user, role, location = {}, onClose }) {
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!user) return null;

  const name = firstValue(user.name, user.full_name, user.username) || "User";
  const userRole = firstValue(user.role, user.user_role, user.user_type, role);
  const status = firstValue(user.status, "active");
  const district = firstValue(
    location.district,
    user.district?.name,
    user.district_name,
    user.districtName,
    user.linked_entity?.district?.name
  );
  const subdivision = firstValue(
    location.subdivision,
    user.subdivision?.name,
    user.subdivision_name,
    user.subdivisionName,
    user.linked_entity?.subdivision?.name
  );
  const block = firstValue(
    location.block,
    user.block?.name,
    user.block_name,
    user.blockName
  );
  const createdAt = firstValue(user.created_at, user.createdAt);
  const roleLabel = userRole?.replaceAll("_", " ");
  const roleStyles = {
    super_admin: "bg-blue-100 text-blue-700",
    admin: "bg-green-100 text-green-700",
    district: "bg-purple-100 text-purple-700",
    subdivision: "bg-orange-100 text-orange-700",
    block: "bg-cyan-100 text-cyan-700",
  };

  const details = [
    // { label: "User ID", value: user.id, icon: UserRound },
    { label: "Email address", value: user.email, icon: Mail },
    { label: "Phone number", value: user.phone, icon: Phone },
    { label: "District", value: district, icon: MapPin },
    { label: "Subdivision", value: subdivision, icon: MapPin },
    { label: "Block", value: block, icon: MapPin },
    { label: "Joined", value: createdAt, icon: CalendarDays },
  ].filter(({ value }) => firstValue(value));

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="user-details-title"
        className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="relative bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-800 px-6 pb-7 pt-6 text-white sm:px-8">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close user details"
            className="absolute right-4 top-4 rounded-lg p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X size={20} />
          </button>

          <div className="flex items-center gap-4 pr-10">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-2xl font-bold uppercase shadow-inner">
              {name.trim().charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-blue-200">
                User profile
              </p>
              <h2 id="user-details-title" className="truncate text-xl font-semibold sm:text-2xl">
                {name}
              </h2>
              <p className="mt-1 truncate text-sm text-blue-100/80">
                {firstValue(user.email, "Account details")}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-6 px-6 py-6 sm:px-8">
          <div className="flex flex-wrap items-center gap-2">
            {userRole && (
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold capitalize ${
                  roleStyles[userRole] || "bg-slate-100 text-slate-700"
                }`}
              >
                <ShieldCheck size={14} />
                {roleLabel}
              </span>
            )}
            <span
              className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize ${
                status === "active"
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {status}
            </span>
          </div>

          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Account information
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {details.map(({ label, value, icon: Icon }) => (
                <div
                  key={label}
                  className="flex min-w-0 items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/80 p-3.5"
                >
                  <span className="mt-0.5 rounded-lg bg-white p-2 text-slate-500 shadow-sm">
                    <Icon size={16} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-400">{label}</p>
                    <p className="mt-1 break-words text-sm font-medium text-slate-800">
                      {label === "Joined" && !Number.isNaN(Date.parse(value))
                        ? new Date(value).toLocaleDateString()
                        : value}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
            >
              Close
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

export default UserDetailsModal;
