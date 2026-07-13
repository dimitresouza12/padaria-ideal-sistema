/**
 * Ícones SVG minimalistas (stroke). Sem emojis em nenhuma parte da interface.
 */
import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Base({ size = 16, children, ...rest }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const IconDashboard = (p: IconProps) => (
  <Base {...p}>
    <rect x="3" y="3" width="7" height="9" rx="1.5" />
    <rect x="14" y="3" width="7" height="5" rx="1.5" />
    <rect x="14" y="12" width="7" height="9" rx="1.5" />
    <rect x="3" y="16" width="7" height="5" rx="1.5" />
  </Base>
);

export const IconVenda = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 8v8M8 12h8" />
  </Base>
);

export const IconProduto = (p: IconProps) => (
  <Base {...p}>
    <path d="M21 8l-9-5-9 5 9 5 9-5z" />
    <path d="M3 8v8l9 5 9-5V8" />
    <path d="M12 13v8" />
  </Base>
);

export const IconComercio = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 21V7a2 2 0 0 1 2-2h5v16" />
    <path d="M15 21V11h5a2 2 0 0 1 2 2v8" />
    <path d="M9 9h0M9 13h0M9 17h0" />
  </Base>
);

export const IconLembrete = (p: IconProps) => (
  <Base {...p}>
    <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.7 21a2 2 0 0 1-3.4 0" />
  </Base>
);

export const IconSair = (p: IconProps) => (
  <Base {...p}>
    <path d="M15 12H3M8 7l-5 5 5 5M16 3h3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-3" />
  </Base>
);

export const IconMenu = (p: IconProps) => (
  <Base {...p}>
    <path d="M3 6h18M3 12h18M3 18h18" />
  </Base>
);

export const IconRestaurar = (p: IconProps) => (
  <Base {...p}>
    <path d="M3 12a9 9 0 1 0 3-6.7" />
    <path d="M3 4v5h5" />
  </Base>
);

export const IconAlerta = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 8v5M12 16h0" />
  </Base>
);

export const IconTrigo = (p: IconProps) => (
  <Base {...p} strokeWidth={1.8}>
    <path d="M4 13c0-3 2.5-5 6-5s6 2 6 5" />
    <path d="M3 13h18l-1.4 6.2a1.5 1.5 0 0 1-1.46 1.15H5.86A1.5 1.5 0 0 1 4.4 19.2z" />
    <path d="M9 8V5.5M12 8V5M15 8V5.5" />
  </Base>
);

export const IconConfiguracoes = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </Base>
);

export const IconUsuarioMais = (p: IconProps) => (
  <Base {...p}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M19 8v6M22 11h-6" />
  </Base>
);

export const IconHistorico = (p: IconProps) => (
  <Base {...p}>
    <path d="M3 3v5h5" />
    <path d="M3.05 13A9 9 0 1 0 6 5.3L3 8" />
    <path d="M12 7v5l4 2" />
  </Base>
);

export const IconMeta = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="5" />
    <circle cx="12" cy="12" r="1" />
  </Base>
);

export const IconComissao = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M9.5 15.5a2.5 2.5 0 0 0 2.5 2h1a2 2 0 0 0 0-4h-2a2 2 0 0 1 0-4h1a2.5 2.5 0 0 1 2.5 2" />
    <path d="M12 6.5v1M12 16.5v1" />
  </Base>
);

export const IconRelatorio = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 20V6a2 2 0 0 1 2-2h8l6 6v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
    <path d="M14 4v6h6" />
    <path d="M8 13h8M8 17h5" />
  </Base>
);

export const IconDownload = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 3v12M7 10l5 5 5-5" />
    <path d="M4 21h16" />
  </Base>
);

export const iconePorAba = {
  dashboard: IconDashboard,
  vendas: IconVenda,
  historico: IconHistorico,
  produtos: IconProduto,
  comercios: IconComercio,
  metas: IconMeta,
  comissoes: IconComissao,
  lembretes: IconLembrete,
  relatorios: IconRelatorio,
  configuracoes: IconConfiguracoes,
} as const;
