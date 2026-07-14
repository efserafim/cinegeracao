import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import api, { mediaUrl } from "../../services/api";
import { Button, Input, TextArea, Loading } from "../../components/ui";
export default function EventoFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: { status: "PRE_INSCRICAO", valor: 10, vagasMaximas: 100 }
  });
  const [banner, setBanner] = useState(null);
  const [bannerAtual, setBannerAtual] = useState(null);
  const [previewLocal, setPreviewLocal] = useState(null);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!isEdit) return;
    api.get(`/eventos/${id}`).then((res) => {
      const e = res.data.data;
      reset({
        nome: e.nome,
        descricao: e.descricao,
        valor: e.valor,
        data: e.data?.slice(0, 10),
        horario: e.horario,
        local: e.local,
        cidade: e.cidade,
        vagasMaximas: e.vagasMaximas,
        chavePix: e.chavePix,
        nomeFavorecido: e.nomeFavorecido,
        status: e.status
      });
      setBannerAtual(e.bannerUrl || null);
    }).finally(() => setLoading(false));
  }, [id, isEdit, reset]);
  useEffect(() => () => {
    if (previewLocal) URL.revokeObjectURL(previewLocal);
  }, [previewLocal]);
  function onBannerChange(e) {
    const file = e.target.files?.[0] || null;
    setBanner(file);
    if (previewLocal) URL.revokeObjectURL(previewLocal);
    setPreviewLocal(file ? URL.createObjectURL(file) : null);
  }
  async function onSubmit(values) {
    setSaving(true);
    setError("");
    try {
      const form = new FormData();
      Object.entries(values).forEach(([k, v]) => form.append(k, v ?? ""));
      if (banner) form.append("banner", banner);
      if (isEdit) await api.put(`/eventos/${id}`, form);
      else await api.post("/eventos", form);
      navigate("/admin/eventos");
    } catch (err) {
      setError(err.response?.data?.message || "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }
  if (loading) return <Loading />;
  const previewSrc = previewLocal || mediaUrl(bannerAtual);
  return <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="font-display text-3xl">{isEdit ? "Editar evento" : "Novo evento"}</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input label="Nome" {...register("nome", { required: "Obrigatório" })} error={errors.nome?.message} />
        <TextArea label="Descrição" rows={4} {...register("descricao", { required: "Obrigatório" })} error={errors.descricao?.message} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Valor (R$)" type="number" step="0.01" {...register("valor", { required: true })} />
          <Input label="Vagas máximas" type="number" {...register("vagasMaximas", { required: true })} />
          <Input label="Data" type="date" {...register("data", { required: true })} />
          <Input label="Horário" placeholder="19:30" {...register("horario", { required: true })} />
          <Input label="Local" {...register("local", { required: true })} />
          <Input label="Cidade" {...register("cidade", { required: true })} />
          <Input label="Chave PIX" {...register("chavePix", { required: true })} />
          <Input label="Nome do favorecido" {...register("nomeFavorecido", { required: true })} />
        </div>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-[var(--color-ink-soft)]">Status</span>
          <select
    className="w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm dark:border-white/15 dark:bg-slate-900"
    {...register("status")}
  >
            <option value="RASCUNHO">Rascunho</option>
            <option value="PRE_INSCRICAO">Pré-inscrição (sem pagamento)</option>
            <option value="ABERTO">Aberto (com cobrança)</option>
            <option value="ENCERRADO">Encerrado</option>
            <option value="CANCELADO">Cancelado</option>
          </select>
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-[var(--color-ink-soft)]">Banner</span>
          <input type="file" accept="image/png,image/jpeg,image/jpg,image/webp" onChange={onBannerChange} />
          {banner && <p className="text-xs text-[var(--color-ink-soft)]">Selecionado: {banner.name}</p>}
          {previewSrc && <img
    src={previewSrc}
    alt="Preview do banner"
    className="mt-2 max-h-48 w-full rounded-xl object-cover"
  />}
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
      </form>
    </div>;
}
