export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: { extensions?: Json; operationName?: string; query?: string; variables?: Json };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      admin_audit_log: {
        Row: {
          action: string;
          actor_id: string | null;
          after: Json | null;
          before: Json | null;
          created_at: string;
          id: number;
          reason: string | null;
          target_id: string;
          target_type: string;
        };
        ComputedFields: never;
        Insert: {
          action: string;
          actor_id?: string | null;
          after?: Json | null;
          before?: Json | null;
          created_at?: string;
          id?: never;
          reason?: string | null;
          target_id: string;
          target_type: string;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          after?: Json | null;
          before?: Json | null;
          created_at?: string;
          id?: never;
          reason?: string | null;
          target_id?: string;
          target_type?: string;
        };
        Relationships: [
          {
            foreignKeyName: "admin_audit_log_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      data_requests: {
        Row: {
          created_at: string;
          id: string;
          kind: Database["public"]["Enums"]["data_request_kind"];
          note: string | null;
          profile_id: string;
          resolved_at: string | null;
          resolved_by: string | null;
          status: Database["public"]["Enums"]["data_request_status"];
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          kind: Database["public"]["Enums"]["data_request_kind"];
          note?: string | null;
          profile_id: string;
          resolved_at?: string | null;
          resolved_by?: string | null;
          status?: Database["public"]["Enums"]["data_request_status"];
        };
        Update: {
          created_at?: string;
          id?: string;
          kind?: Database["public"]["Enums"]["data_request_kind"];
          note?: string | null;
          profile_id?: string;
          resolved_at?: string | null;
          resolved_by?: string | null;
          status?: Database["public"]["Enums"]["data_request_status"];
        };
        Relationships: [
          {
            foreignKeyName: "data_requests_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "data_requests_resolved_by_fkey";
            columns: ["resolved_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      feature_flags: {
        Row: {
          description: string | null;
          enabled: boolean;
          key: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          description?: string | null;
          enabled?: boolean;
          key: string;
          updated_at?: string;
        };
        Update: {
          description?: string | null;
          enabled?: boolean;
          key?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      interests: {
        Row: {
          id: number;
          is_active: boolean;
          label_sl: string;
          slug: string;
          sort: number;
        };
        ComputedFields: never;
        Insert: {
          id?: never;
          is_active?: boolean;
          label_sl: string;
          slug: string;
          sort?: number;
        };
        Update: {
          id?: never;
          is_active?: boolean;
          label_sl?: string;
          slug?: string;
          sort?: number;
        };
        Relationships: [];
      };
      platform_roles: {
        Row: {
          created_at: string;
          granted_by: string | null;
          profile_id: string;
          role: Database["public"]["Enums"]["platform_role"];
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          granted_by?: string | null;
          profile_id: string;
          role: Database["public"]["Enums"]["platform_role"];
        };
        Update: {
          created_at?: string;
          granted_by?: string | null;
          profile_id?: string;
          role?: Database["public"]["Enums"]["platform_role"];
        };
        Relationships: [
          {
            foreignKeyName: "platform_roles_granted_by_fkey";
            columns: ["granted_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "platform_roles_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      profile_interests: {
        Row: {
          created_at: string;
          interest_id: number;
          profile_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          interest_id: number;
          profile_id: string;
        };
        Update: {
          created_at?: string;
          interest_id?: number;
          profile_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profile_interests_interest_id_fkey";
            columns: ["interest_id"];
            isOneToOne: false;
            referencedRelation: "interests";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "profile_interests_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          approx_city: string | null;
          bio: string | null;
          created_at: string;
          display_name: string;
          handle: string;
          id: string;
          locale: string;
          onboarded_at: string | null;
          status: Database["public"]["Enums"]["account_status"];
          updated_at: string;
          visibility: Database["public"]["Enums"]["profile_visibility"];
        };
        ComputedFields: never;
        Insert: {
          approx_city?: string | null;
          bio?: string | null;
          created_at?: string;
          display_name: string;
          handle: string;
          id: string;
          locale?: string;
          onboarded_at?: string | null;
          status?: Database["public"]["Enums"]["account_status"];
          updated_at?: string;
          visibility?: Database["public"]["Enums"]["profile_visibility"];
        };
        Update: {
          approx_city?: string | null;
          bio?: string | null;
          created_at?: string;
          display_name?: string;
          handle?: string;
          id?: string;
          locale?: string;
          onboarded_at?: string | null;
          status?: Database["public"]["Enums"]["account_status"];
          updated_at?: string;
          visibility?: Database["public"]["Enums"]["profile_visibility"];
        };
        Relationships: [];
      };
      space_members: {
        Row: {
          created_at: string;
          invited_by: string | null;
          profile_id: string;
          role: Database["public"]["Enums"]["space_role"];
          space_id: string;
          status: Database["public"]["Enums"]["membership_status"];
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          invited_by?: string | null;
          profile_id: string;
          role: Database["public"]["Enums"]["space_role"];
          space_id: string;
          status?: Database["public"]["Enums"]["membership_status"];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          invited_by?: string | null;
          profile_id?: string;
          role?: Database["public"]["Enums"]["space_role"];
          space_id?: string;
          status?: Database["public"]["Enums"]["membership_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "space_members_invited_by_fkey";
            columns: ["invited_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "space_members_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "space_members_space_id_fkey";
            columns: ["space_id"];
            isOneToOne: false;
            referencedRelation: "spaces";
            referencedColumns: ["id"];
          },
        ];
      };
      spaces: {
        Row: {
          bio: string | null;
          capabilities: NonNullable<Json>;
          city: string | null;
          created_at: string;
          created_by: string;
          deleted_at: string | null;
          id: string;
          is_demo: boolean;
          kind: Database["public"]["Enums"]["space_kind"];
          membership_mode: Database["public"]["Enums"]["membership_mode"];
          name: string;
          slug: string;
          social_links: NonNullable<Json>;
          tagline: string | null;
          updated_at: string;
          verification_status: Database["public"]["Enums"]["verification_status"];
        };
        ComputedFields: never;
        Insert: {
          bio?: string | null;
          capabilities?: NonNullable<Json>;
          city?: string | null;
          created_at?: string;
          created_by: string;
          deleted_at?: string | null;
          id?: string;
          is_demo?: boolean;
          kind: Database["public"]["Enums"]["space_kind"];
          membership_mode?: Database["public"]["Enums"]["membership_mode"];
          name: string;
          slug: string;
          social_links?: NonNullable<Json>;
          tagline?: string | null;
          updated_at?: string;
          verification_status?: Database["public"]["Enums"]["verification_status"];
        };
        Update: {
          bio?: string | null;
          capabilities?: NonNullable<Json>;
          city?: string | null;
          created_at?: string;
          created_by?: string;
          deleted_at?: string | null;
          id?: string;
          is_demo?: boolean;
          kind?: Database["public"]["Enums"]["space_kind"];
          membership_mode?: Database["public"]["Enums"]["membership_mode"];
          name?: string;
          slug?: string;
          social_links?: NonNullable<Json>;
          tagline?: string | null;
          updated_at?: string;
          verification_status?: Database["public"]["Enums"]["verification_status"];
        };
        Relationships: [
          {
            foreignKeyName: "spaces_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      user_consents: {
        Row: {
          created_at: string;
          granted: boolean;
          id: number;
          kind: Database["public"]["Enums"]["consent_kind"];
          profile_id: string;
          source: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          granted: boolean;
          id?: never;
          kind: Database["public"]["Enums"]["consent_kind"];
          profile_id: string;
          source?: string;
        };
        Update: {
          created_at?: string;
          granted?: boolean;
          id?: never;
          kind?: Database["public"]["Enums"]["consent_kind"];
          profile_id?: string;
          source?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_consents_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      admin_resolve_data_request: {
        Args: {
          p_reason: string;
          p_request: string;
          p_status: Database["public"]["Enums"]["data_request_status"];
        };
        Returns: undefined;
      };
      admin_set_profile_status: {
        Args: {
          p_profile: string;
          p_reason: string;
          p_status: Database["public"]["Enums"]["account_status"];
        };
        Returns: undefined;
      };
      can_view_profile: { Args: { p_profile: string }; Returns: boolean };
      create_space: {
        Args: {
          p_city?: string;
          p_kind: Database["public"]["Enums"]["space_kind"];
          p_name: string;
          p_slug: string;
          p_tagline?: string;
        };
        Returns: string;
      };
      has_platform_role: {
        Args: { roles: Database["public"]["Enums"]["platform_role"][] };
        Returns: boolean;
      };
      invite_space_member: {
        Args: { p_handle: string; p_role: Database["public"]["Enums"]["space_role"]; p_space: string };
        Returns: undefined;
      };
      is_active_user: { Args: Record<PropertyKey, never>; Returns: boolean };
      is_platform_staff: { Args: Record<PropertyKey, never>; Returns: boolean };
      is_space_role: {
        Args: { min_role: Database["public"]["Enums"]["space_role"]; p_space: string };
        Returns: boolean;
      };
      remove_space_member: { Args: { p_profile: string; p_space: string }; Returns: undefined };
      respond_space_invite: { Args: { p_accept: boolean; p_space: string }; Returns: undefined };
      set_my_interests: { Args: { p_interest_ids: number[] }; Returns: undefined };
      set_space_member_role: {
        Args: { p_profile: string; p_role: Database["public"]["Enums"]["space_role"]; p_space: string };
        Returns: undefined;
      };
      space_role_rank: { Args: { r: Database["public"]["Enums"]["space_role"] }; Returns: number };
      write_audit: {
        Args: {
          p_action: string;
          p_after: Json;
          p_before: Json;
          p_reason: string;
          p_target_id: string;
          p_target_type: string;
        };
        Returns: undefined;
      };
    };
    Enums: {
      account_status: "active" | "suspended" | "deleted";
      consent_kind: "marketing_email" | "push" | "approx_location";
      data_request_kind: "export" | "deletion";
      data_request_status: "open" | "in_progress" | "done" | "rejected";
      membership_mode: "none" | "open" | "approval";
      membership_status: "pending" | "active" | "removed";
      platform_role: "super_admin" | "admin" | "moderator" | "finance" | "support";
      profile_visibility: "public" | "members" | "private";
      space_kind: "solo_creator" | "community" | "studio" | "association";
      space_role: "owner" | "admin" | "staff" | "member";
      verification_status: "unverified" | "pending" | "verified" | "rejected";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    keyof (DefaultSchema["Tables"] & DefaultSchema["Views"]) | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      account_status: ["active", "suspended", "deleted"],
      consent_kind: ["marketing_email", "push", "approx_location"],
      data_request_kind: ["export", "deletion"],
      data_request_status: ["open", "in_progress", "done", "rejected"],
      membership_mode: ["none", "open", "approval"],
      membership_status: ["pending", "active", "removed"],
      platform_role: ["super_admin", "admin", "moderator", "finance", "support"],
      profile_visibility: ["public", "members", "private"],
      space_kind: ["solo_creator", "community", "studio", "association"],
      space_role: ["owner", "admin", "staff", "member"],
      verification_status: ["unverified", "pending", "verified", "rejected"],
    },
  },
} as const;
