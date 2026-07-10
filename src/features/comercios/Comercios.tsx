import { useState } from 'react';
import { useDataStore } from '@/store/useDataStore';
import { Card, Button } from '@/components/ui';

const REGIOES = ['Centro', 'Zona Sul', 'Zona Norte', 'Zona Leste', 'Zona Oeste'];
const FORM_INICIAL = { razao_social: '', cnpj: '', telefone: '', regiao: 'Centro' };

export function Comercios() {
  const comercios = useDataStore((s) => s.comercios);
  const criarComercio = useDataStore((s) => s.criarComercio);
  const [form, setForm] = useState(FORM_INICIAL);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await criarComercio({
      razao_social: form.razao_social.trim(),
      cnpj: form.cnpj.trim(),
      telefone: form.telefone.trim(),
      regiao: form.regiao,
    });
    setForm(FORM_INICIAL);
  };

  return (
    <div className="flex flex-col gap-5">
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-line-strong text-left text-[10.5px] font-bold uppercase tracking-wider text-ink-muted">
                <th className="px-5 py-2.5">Nome do Comércio</th>
                <th className="px-5 py-2.5">CNPJ</th>
                <th className="px-5 py-2.5">Telefone</th>
                <th className="px-5 py-2.5">Região</th>
              </tr>
            </thead>
            <tbody>
              {comercios.map((c) => (
                <tr key={c.id} className="border-b border-line text-[13px] last:border-0">
                  <td className="px-5 py-3 font-semibold">{c.razao_social}</td>
                  <td className="px-5 py-3 tabular-nums text-ink-muted">{c.cnpj}</td>
                  <td className="px-5 py-3 tabular-nums">{c.telefone}</td>
                  <td className="px-5 py-3">{c.regiao}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="max-w-xl p-5">
        <div className="mb-4 text-sm font-bold">Cadastrar Novo Comércio</div>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div>
            <label className="field-label">Razão social / Nome fantasia</label>
            <input
              className="field"
              value={form.razao_social}
              onChange={(e) => setForm((f) => ({ ...f, razao_social: e.target.value }))}
              placeholder="Ex: Mercado Boa Vista"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="field-label">CNPJ</label>
              <input
                className="field"
                value={form.cnpj}
                onChange={(e) => setForm((f) => ({ ...f, cnpj: e.target.value }))}
                placeholder="00.000.000/0001-00"
                required
              />
            </div>
            <div>
              <label className="field-label">Telefone</label>
              <input
                className="field"
                value={form.telefone}
                onChange={(e) => setForm((f) => ({ ...f, telefone: e.target.value }))}
                placeholder="(11) 0000-0000"
                required
              />
            </div>
          </div>
          <div>
            <label className="field-label">Região</label>
            <select
              className="field"
              value={form.regiao}
              onChange={(e) => setForm((f) => ({ ...f, regiao: e.target.value }))}
            >
              {REGIOES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end border-t border-line pt-4">
            <Button type="submit">Cadastrar Comércio</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
