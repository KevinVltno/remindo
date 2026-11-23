"use client";

import { useActionState, useState } from "react";
import { updateMember } from "@/app/admin/users/actions";
import type { Member } from "@/lib/todos";
import { Feedback } from "./feedback";

export function MemberForm({ member }: { member: Member }) {
  const [feedback, submit, pending] = useActionState(updateMember, {});
  const [role, setRole] = useState(member.role);
  const [active, setActive] = useState(member.is_active ? "yes" : "no");
  return (
    <form className="actions member-form" action={submit} aria-busy={pending}>
      <input type="hidden" name="id" value={member.id} />
      <label>Role<select name="role" value={role} onChange={event => setRole(event.target.value as Member["role"])}>
        <option value="user">User</option><option value="admin">Admin</option>
      </select></label>
      <label>Status<select name="is_active" value={active} onChange={event => setActive(event.target.value)}>
        <option value="yes">Aktif</option><option value="no">Nonaktif</option>
      </select></label>
      <button disabled={pending}>{pending ? "Menyimpan…" : "Simpan"}</button>
      <Feedback value={feedback} />
    </form>
  );
}
