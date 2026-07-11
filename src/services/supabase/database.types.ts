// Tipos gerados a partir do schema do Supabase (projeto padaria-ideal).
// Regenerar com: MCP generate_typescript_types, ou
//   supabase gen types typescript --project-id audtpilnovrzwszeubkz
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      comercios: {
        Row: {
          ativo: boolean
          cnpj: string
          id: string
          razao_social: string
          regiao: string
          telefone: string
        }
        Insert: {
          ativo?: boolean
          cnpj: string
          id?: string
          razao_social: string
          regiao: string
          telefone: string
        }
        Update: {
          ativo?: boolean
          cnpj?: string
          id?: string
          razao_social?: string
          regiao?: string
          telefone?: string
        }
        Relationships: []
      }
      credenciais: {
        Row: {
          login: string
          senha: string
          usuario_id: string
        }
        Insert: {
          login: string
          senha: string
          usuario_id: string
        }
        Update: {
          login?: string
          senha?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credenciais_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      historico_mensal: {
        Row: {
          ordem: number
          rotulo: string
          total: number
        }
        Insert: {
          ordem: number
          rotulo: string
          total: number
        }
        Update: {
          ordem?: number
          rotulo?: string
          total?: number
        }
        Relationships: []
      }
      metas: {
        Row: {
          data_fim: string
          data_inicio: string
          dimensao: Database["public"]["Enums"]["tipo_meta"]
          id: string
          nome: string
          periodicidade: Database["public"]["Enums"]["periodicidade"]
          principal: boolean
          valor_alvo: number
        }
        Insert: {
          data_fim: string
          data_inicio: string
          dimensao?: Database["public"]["Enums"]["tipo_meta"]
          id?: string
          nome: string
          periodicidade: Database["public"]["Enums"]["periodicidade"]
          principal?: boolean
          valor_alvo?: number
        }
        Update: {
          data_fim?: string
          data_inicio?: string
          dimensao?: Database["public"]["Enums"]["tipo_meta"]
          id?: string
          nome?: string
          periodicidade?: Database["public"]["Enums"]["periodicidade"]
          principal?: boolean
          valor_alvo?: number
        }
        Relationships: []
      }
      metas_produtos: {
        Row: {
          id: string
          meta_id: string
          produto_id: string
          valor_alvo: number
        }
        Insert: {
          id?: string
          meta_id: string
          produto_id: string
          valor_alvo?: number
        }
        Update: {
          id?: string
          meta_id?: string
          produto_id?: string
          valor_alvo?: number
        }
        Relationships: [
          {
            foreignKeyName: "metas_produtos_meta_id_fkey"
            columns: ["meta_id"]
            isOneToOne: false
            referencedRelation: "metas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "metas_produtos_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      produtos: {
        Row: {
          ativo: boolean
          categoria: string | null
          id: string
          nome: string
          preco_atacado: number
          preco_custo: number
          preco_varejo: number
          qtd_min_atacado: number
          sku: string
        }
        Insert: {
          ativo?: boolean
          categoria?: string | null
          id?: string
          nome: string
          preco_atacado: number
          preco_custo: number
          preco_varejo: number
          qtd_min_atacado?: number
          sku: string
        }
        Update: {
          ativo?: boolean
          categoria?: string | null
          id?: string
          nome?: string
          preco_atacado?: number
          preco_custo?: number
          preco_varejo?: number
          qtd_min_atacado?: number
          sku?: string
        }
        Relationships: []
      }
      solicitacoes_acesso: {
        Row: {
          criado_em: string
          email: string
          id: string
          nome: string
          senha: string
          status: Database["public"]["Enums"]["status_solicitacao"]
        }
        Insert: {
          criado_em?: string
          email: string
          id?: string
          nome: string
          senha: string
          status?: Database["public"]["Enums"]["status_solicitacao"]
        }
        Update: {
          criado_em?: string
          email?: string
          id?: string
          nome?: string
          senha?: string
          status?: Database["public"]["Enums"]["status_solicitacao"]
        }
        Relationships: []
      }
      usuarios: {
        Row: {
          ativo: boolean
          criado_em: string
          email: string
          id: string
          meta_individual: number
          nome: string
          perfil: Database["public"]["Enums"]["perfil"]
          taxa_comissao: number
        }
        Insert: {
          ativo?: boolean
          criado_em?: string
          email: string
          id?: string
          meta_individual?: number
          nome: string
          perfil?: Database["public"]["Enums"]["perfil"]
          taxa_comissao?: number
        }
        Update: {
          ativo?: boolean
          criado_em?: string
          email?: string
          id?: string
          meta_individual?: number
          nome?: string
          perfil?: Database["public"]["Enums"]["perfil"]
          taxa_comissao?: number
        }
        Relationships: []
      }
      vendas: {
        Row: {
          comercio_id: string
          criado_em: string
          custo_total: number
          data_vencimento: string | null
          data_venda: string
          forma_pagamento: Database["public"]["Enums"]["forma_pagamento"]
          id: string
          margem: number
          modo_preco: Database["public"]["Enums"]["modo_preco"]
          prazo_dias: number | null
          preco_unitario: number
          produto_id: string
          quantidade: number
          status: Database["public"]["Enums"]["status_venda"]
          valor_total: number
          vendedor_id: string
        }
        Insert: {
          comercio_id: string
          criado_em?: string
          custo_total: number
          data_vencimento?: string | null
          data_venda: string
          forma_pagamento: Database["public"]["Enums"]["forma_pagamento"]
          id?: string
          margem: number
          modo_preco: Database["public"]["Enums"]["modo_preco"]
          prazo_dias?: number | null
          preco_unitario: number
          produto_id: string
          quantidade: number
          status: Database["public"]["Enums"]["status_venda"]
          valor_total: number
          vendedor_id: string
        }
        Update: {
          comercio_id?: string
          criado_em?: string
          custo_total?: number
          data_vencimento?: string | null
          data_venda?: string
          forma_pagamento?: Database["public"]["Enums"]["forma_pagamento"]
          id?: string
          margem?: number
          modo_preco?: Database["public"]["Enums"]["modo_preco"]
          prazo_dias?: number | null
          preco_unitario?: number
          produto_id?: string
          quantidade?: number
          status?: Database["public"]["Enums"]["status_venda"]
          valor_total?: number
          vendedor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendas_comercio_id_fkey"
            columns: ["comercio_id"]
            isOneToOne: false
            referencedRelation: "comercios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendas_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendas_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      reset_dados_exemplo: { Args: Record<PropertyKey, never>; Returns: undefined }
    }
    Enums: {
      forma_pagamento: "a_vista" | "a_prazo"
      modo_preco: "atacado" | "varejo"
      perfil: "admin" | "vendedor"
      periodicidade: "semanal" | "mensal" | "trimestral" | "personalizado"
      status_solicitacao: "pendente" | "aprovado" | "recusado"
      status_venda: "pago" | "pendente" | "vencido"
      tipo_meta: "geral" | "por_produto"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
