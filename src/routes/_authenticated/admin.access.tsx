import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, Plus, Globe, Mail } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/access")({
  head: () => ({ meta: [{ title: "Acceso autorizado" }] }),
  component: AccessPage,
});

function AccessPage() {
  const qc = useQueryClient();
  const { data: domains = [] } = useQuery({
    queryKey:["allowed_domains"],
    queryFn: async () => (await supabase.from("allowed_email_domains").select("*").order("domain")).data ?? [],
  });
  const { data: emails = [] } = useQuery({
    queryKey:["allowed_emails"],
    queryFn: async () => (await supabase.from("allowed_emails").select("*").order("email")).data ?? [],
  });
  const [d, setD] = useState(""); const [e, setE] = useState("");

  const addDomain = useMutation({
    mutationFn: async (domain:string) => { const { error } = await supabase.from("allowed_email_domains").insert({ domain: domain.toLowerCase().trim() }); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey:["allowed_domains"] }); setD(""); toast.success("Dominio autorizado"); },
    onError: (er:any)=>toast.error(er.message),
  });
  const delDomain = useMutation({
    mutationFn: async (id:string) => { const { error } = await supabase.from("allowed_email_domains").delete().eq("id",id); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey:["allowed_domains"] }),
  });
  const addEmail = useMutation({
    mutationFn: async (email:string) => { const { error } = await supabase.from("allowed_emails").insert({ email: email.toLowerCase().trim() }); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey:["allowed_emails"] }); setE(""); toast.success("Correo autorizado"); },
    onError: (er:any)=>toast.error(er.message),
  });
  const delEmail = useMutation({
    mutationFn: async (id:string) => { const { error } = await supabase.from("allowed_emails").delete().eq("id",id); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey:["allowed_emails"] }),
  });

  return (
    <div className="grid md:grid-cols-2 gap-5">
      <Card className="industrial-card p-5 space-y-4">
        <div className="flex items-center gap-2"><Globe className="h-5 w-5 text-primary"/><h2 className="text-lg font-semibold">Dominios autorizados</h2></div>
        <p className="text-sm text-muted-foreground">Cualquier correo @dominio listado puede crearse en el sistema.</p>
        <div className="flex gap-2">
          <Input placeholder="grupo.sitsa.com" value={d} onChange={(ev)=>setD(ev.target.value)} />
          <Button onClick={()=>d && addDomain.mutate(d)}><Plus className="h-4 w-4"/></Button>
        </div>
        <Table>
          <TableHeader><TableRow><TableHead>Dominio</TableHead><TableHead></TableHead></TableRow></TableHeader>
          <TableBody>
            {(domains as any[]).map(x => (
              <TableRow key={x.id}>
                <TableCell className="font-mono">@{x.domain}</TableCell>
                <TableCell className="text-right"><Button size="icon" variant="ghost" onClick={()=>delDomain.mutate(x.id)}><Trash2 className="h-4 w-4"/></Button></TableCell>
              </TableRow>
            ))}
            {domains.length===0 && <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground">Sin dominios</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Card>

      <Card className="industrial-card p-5 space-y-4">
        <div className="flex items-center gap-2"><Mail className="h-5 w-5 text-primary"/><h2 className="text-lg font-semibold">Correos en lista blanca</h2></div>
        <p className="text-sm text-muted-foreground">Correos puntuales autorizados, además de los dominios.</p>
        <div className="flex gap-2">
          <Input placeholder="bodega@ecoplanet.com" type="email" value={e} onChange={(ev)=>setE(ev.target.value)} />
          <Button onClick={()=>e && addEmail.mutate(e)}><Plus className="h-4 w-4"/></Button>
        </div>
        <Table>
          <TableHeader><TableRow><TableHead>Correo</TableHead><TableHead></TableHead></TableRow></TableHeader>
          <TableBody>
            {(emails as any[]).map(x => (
              <TableRow key={x.id}>
                <TableCell>{x.email}</TableCell>
                <TableCell className="text-right"><Button size="icon" variant="ghost" onClick={()=>delEmail.mutate(x.id)}><Trash2 className="h-4 w-4"/></Button></TableCell>
              </TableRow>
            ))}
            {emails.length===0 && <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground">Sin correos puntuales</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
