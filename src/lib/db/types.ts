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
      booking_reminders: {
        Row: {
          booking_id: string;
          occurrence_id: string;
          sent_at: string;
        };
        ComputedFields: never;
        Insert: {
          booking_id: string;
          occurrence_id: string;
          sent_at?: string;
        };
        Update: {
          booking_id?: string;
          occurrence_id?: string;
          sent_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "booking_reminders_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: false;
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "booking_reminders_occurrence_id_fkey";
            columns: ["occurrence_id"];
            isOneToOne: false;
            referencedRelation: "event_occurrences";
            referencedColumns: ["id"];
          },
        ];
      };
      bookings: {
        Row: {
          amount_cents: number | null;
          booker_id: string;
          cancelled_at: string | null;
          created_at: string;
          event_id: string;
          id: string;
          note: string | null;
          occurrence_id: string | null;
          payment_confirmed_at: string | null;
          payment_confirmed_by: string | null;
          payment_due_at: string | null;
          payment_state: string;
          quantity: number;
          status: Database["public"]["Enums"]["booking_status"];
        };
        ComputedFields: never;
        Insert: {
          amount_cents?: number | null;
          booker_id: string;
          cancelled_at?: string | null;
          created_at?: string;
          event_id: string;
          id?: string;
          note?: string | null;
          occurrence_id?: string | null;
          payment_confirmed_at?: string | null;
          payment_confirmed_by?: string | null;
          payment_due_at?: string | null;
          payment_state?: string;
          quantity?: number;
          status?: Database["public"]["Enums"]["booking_status"];
        };
        Update: {
          amount_cents?: number | null;
          booker_id?: string;
          cancelled_at?: string | null;
          created_at?: string;
          event_id?: string;
          id?: string;
          note?: string | null;
          occurrence_id?: string | null;
          payment_confirmed_at?: string | null;
          payment_confirmed_by?: string | null;
          payment_due_at?: string | null;
          payment_state?: string;
          quantity?: number;
          status?: Database["public"]["Enums"]["booking_status"];
        };
        Relationships: [
          {
            foreignKeyName: "bookings_booker_id_fkey";
            columns: ["booker_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bookings_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bookings_occurrence_id_fkey";
            columns: ["occurrence_id"];
            isOneToOne: false;
            referencedRelation: "event_occurrences";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bookings_payment_confirmed_by_fkey";
            columns: ["payment_confirmed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      conversations: {
        Row: {
          a_read_at: string | null;
          b_read_at: string | null;
          created_at: string;
          created_by: string;
          id: string;
          last_message_at: string;
          last_sender_id: string | null;
          user_a: string;
          user_b: string;
        };
        ComputedFields: never;
        Insert: {
          a_read_at?: string | null;
          b_read_at?: string | null;
          created_at?: string;
          created_by: string;
          id?: string;
          last_message_at?: string;
          last_sender_id?: string | null;
          user_a: string;
          user_b: string;
        };
        Update: {
          a_read_at?: string | null;
          b_read_at?: string | null;
          created_at?: string;
          created_by?: string;
          id?: string;
          last_message_at?: string;
          last_sender_id?: string | null;
          user_a?: string;
          user_b?: string;
        };
        Relationships: [
          {
            foreignKeyName: "conversations_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conversations_last_sender_id_fkey";
            columns: ["last_sender_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conversations_user_a_fkey";
            columns: ["user_a"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conversations_user_b_fkey";
            columns: ["user_b"];
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
      event_occurrences: {
        Row: {
          created_at: string;
          ends_at: string;
          event_id: string;
          id: string;
          starts_at: string;
          status: Database["public"]["Enums"]["occurrence_status"];
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          ends_at: string;
          event_id: string;
          id?: string;
          starts_at: string;
          status?: Database["public"]["Enums"]["occurrence_status"];
        };
        Update: {
          created_at?: string;
          ends_at?: string;
          event_id?: string;
          id?: string;
          starts_at?: string;
          status?: Database["public"]["Enums"]["occurrence_status"];
        };
        Relationships: [
          {
            foreignKeyName: "event_occurrences_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
        ];
      };
      event_waitlist: {
        Row: {
          created_at: string;
          event_id: string;
          notified_at: string | null;
          occurrence_id: string | null;
          profile_id: string;
          quantity: number;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          event_id: string;
          notified_at?: string | null;
          occurrence_id?: string | null;
          profile_id: string;
          quantity?: number;
        };
        Update: {
          created_at?: string;
          event_id?: string;
          notified_at?: string | null;
          occurrence_id?: string | null;
          profile_id?: string;
          quantity?: number;
        };
        Relationships: [
          {
            foreignKeyName: "event_waitlist_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "event_waitlist_occurrence_id_fkey";
            columns: ["occurrence_id"];
            isOneToOne: false;
            referencedRelation: "event_occurrences";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "event_waitlist_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      events: {
        Row: {
          address: string | null;
          beginner_friendly: boolean;
          booking_scope: Database["public"]["Enums"]["booking_scope"];
          cancel_reason: string | null;
          cancellation_policy: Database["public"]["Enums"]["cancellation_policy"];
          capacity: number | null;
          city: string | null;
          cover: string;
          cover_image_path: string | null;
          created_at: string;
          created_by: string;
          description: string | null;
          external_url: string | null;
          family_friendly: boolean;
          id: string;
          interest_id: number | null;
          is_demo: boolean;
          is_online: boolean;
          materials: string | null;
          max_per_booking: number;
          online_url: string | null;
          payment_deadline_hours: number | null;
          payment_instructions: string | null;
          payment_mode: string;
          price_cents: number | null;
          published_at: string | null;
          registration_mode: Database["public"]["Enums"]["registration_mode"];
          schedule: Database["public"]["Enums"]["event_schedule"];
          slug: string;
          space_id: string;
          status: Database["public"]["Enums"]["event_status"];
          summary: string | null;
          title: string;
          updated_at: string;
          visibility: Database["public"]["Enums"]["event_visibility"];
        };
        ComputedFields: never;
        Insert: {
          address?: string | null;
          beginner_friendly?: boolean;
          booking_scope?: Database["public"]["Enums"]["booking_scope"];
          cancel_reason?: string | null;
          cancellation_policy?: Database["public"]["Enums"]["cancellation_policy"];
          capacity?: number | null;
          city?: string | null;
          cover?: string;
          cover_image_path?: string | null;
          created_at?: string;
          created_by: string;
          description?: string | null;
          external_url?: string | null;
          family_friendly?: boolean;
          id?: string;
          interest_id?: number | null;
          is_demo?: boolean;
          is_online?: boolean;
          materials?: string | null;
          max_per_booking?: number;
          online_url?: string | null;
          payment_deadline_hours?: number | null;
          payment_instructions?: string | null;
          payment_mode?: string;
          price_cents?: number | null;
          published_at?: string | null;
          registration_mode?: Database["public"]["Enums"]["registration_mode"];
          schedule?: Database["public"]["Enums"]["event_schedule"];
          slug: string;
          space_id: string;
          status?: Database["public"]["Enums"]["event_status"];
          summary?: string | null;
          title: string;
          updated_at?: string;
          visibility?: Database["public"]["Enums"]["event_visibility"];
        };
        Update: {
          address?: string | null;
          beginner_friendly?: boolean;
          booking_scope?: Database["public"]["Enums"]["booking_scope"];
          cancel_reason?: string | null;
          cancellation_policy?: Database["public"]["Enums"]["cancellation_policy"];
          capacity?: number | null;
          city?: string | null;
          cover?: string;
          cover_image_path?: string | null;
          created_at?: string;
          created_by?: string;
          description?: string | null;
          external_url?: string | null;
          family_friendly?: boolean;
          id?: string;
          interest_id?: number | null;
          is_demo?: boolean;
          is_online?: boolean;
          materials?: string | null;
          max_per_booking?: number;
          online_url?: string | null;
          payment_deadline_hours?: number | null;
          payment_instructions?: string | null;
          payment_mode?: string;
          price_cents?: number | null;
          published_at?: string | null;
          registration_mode?: Database["public"]["Enums"]["registration_mode"];
          schedule?: Database["public"]["Enums"]["event_schedule"];
          slug?: string;
          space_id?: string;
          status?: Database["public"]["Enums"]["event_status"];
          summary?: string | null;
          title?: string;
          updated_at?: string;
          visibility?: Database["public"]["Enums"]["event_visibility"];
        };
        Relationships: [
          {
            foreignKeyName: "events_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "events_interest_id_fkey";
            columns: ["interest_id"];
            isOneToOne: false;
            referencedRelation: "interests";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "events_space_id_fkey";
            columns: ["space_id"];
            isOneToOne: false;
            referencedRelation: "spaces";
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
      follows: {
        Row: {
          created_at: string;
          followee_id: string;
          follower_id: string;
          status: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          followee_id: string;
          follower_id: string;
          status?: string;
        };
        Update: {
          created_at?: string;
          followee_id?: string;
          follower_id?: string;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "follows_followee_id_fkey";
            columns: ["followee_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "follows_follower_id_fkey";
            columns: ["follower_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      idea_comments: {
        Row: {
          author_id: string;
          body: string;
          created_at: string;
          id: number;
          idea_id: string;
          removed_at: string | null;
        };
        ComputedFields: never;
        Insert: {
          author_id: string;
          body: string;
          created_at?: string;
          id?: never;
          idea_id: string;
          removed_at?: string | null;
        };
        Update: {
          author_id?: string;
          body?: string;
          created_at?: string;
          id?: never;
          idea_id?: string;
          removed_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "idea_comments_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "idea_comments_idea_id_fkey";
            columns: ["idea_id"];
            isOneToOne: false;
            referencedRelation: "ideas";
            referencedColumns: ["id"];
          },
        ];
      };
      idea_likes: {
        Row: {
          created_at: string;
          idea_id: string;
          profile_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          idea_id: string;
          profile_id: string;
        };
        Update: {
          created_at?: string;
          idea_id?: string;
          profile_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "idea_likes_idea_id_fkey";
            columns: ["idea_id"];
            isOneToOne: false;
            referencedRelation: "ideas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "idea_likes_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      idea_ratings: {
        Row: {
          idea_id: string;
          profile_id: string;
          stars: number;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          idea_id: string;
          profile_id: string;
          stars: number;
          updated_at?: string;
        };
        Update: {
          idea_id?: string;
          profile_id?: string;
          stars?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "idea_ratings_idea_id_fkey";
            columns: ["idea_id"];
            isOneToOne: false;
            referencedRelation: "ideas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "idea_ratings_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      ideas: {
        Row: {
          author_id: string;
          beginner_friendly: boolean;
          body: string;
          cover: string;
          cover_image_path: string | null;
          created_at: string;
          external_url: string | null;
          family_friendly: boolean;
          hidden_reason: string | null;
          id: string;
          interest_id: number | null;
          is_demo: boolean;
          materials: string | null;
          published_at: string;
          slug: string;
          status: string;
          summary: string | null;
          time_needed: string | null;
          title: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          author_id: string;
          beginner_friendly?: boolean;
          body: string;
          cover?: string;
          cover_image_path?: string | null;
          created_at?: string;
          external_url?: string | null;
          family_friendly?: boolean;
          hidden_reason?: string | null;
          id?: string;
          interest_id?: number | null;
          is_demo?: boolean;
          materials?: string | null;
          published_at?: string;
          slug: string;
          status?: string;
          summary?: string | null;
          time_needed?: string | null;
          title: string;
          updated_at?: string;
        };
        Update: {
          author_id?: string;
          beginner_friendly?: boolean;
          body?: string;
          cover?: string;
          cover_image_path?: string | null;
          created_at?: string;
          external_url?: string | null;
          family_friendly?: boolean;
          hidden_reason?: string | null;
          id?: string;
          interest_id?: number | null;
          is_demo?: boolean;
          materials?: string | null;
          published_at?: string;
          slug?: string;
          status?: string;
          summary?: string | null;
          time_needed?: string | null;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ideas_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ideas_interest_id_fkey";
            columns: ["interest_id"];
            isOneToOne: false;
            referencedRelation: "interests";
            referencedColumns: ["id"];
          },
        ];
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
      messages: {
        Row: {
          body: string;
          conversation_id: string;
          created_at: string;
          id: number;
          removed_at: string | null;
          removed_by: string | null;
          sender_id: string;
        };
        ComputedFields: never;
        Insert: {
          body: string;
          conversation_id: string;
          created_at?: string;
          id?: never;
          removed_at?: string | null;
          removed_by?: string | null;
          sender_id: string;
        };
        Update: {
          body?: string;
          conversation_id?: string;
          created_at?: string;
          id?: never;
          removed_at?: string | null;
          removed_by?: string | null;
          sender_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "messages_removed_by_fkey";
            columns: ["removed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "messages_sender_id_fkey";
            columns: ["sender_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          body: string | null;
          created_at: string;
          id: number;
          kind: string;
          link: string | null;
          read_at: string | null;
          recipient_id: string;
          title: string;
        };
        ComputedFields: never;
        Insert: {
          body?: string | null;
          created_at?: string;
          id?: never;
          kind: string;
          link?: string | null;
          read_at?: string | null;
          recipient_id: string;
          title: string;
        };
        Update: {
          body?: string | null;
          created_at?: string;
          id?: never;
          kind?: string;
          link?: string | null;
          read_at?: string | null;
          recipient_id?: string;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_recipient_id_fkey";
            columns: ["recipient_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
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
      post_comments: {
        Row: {
          author_id: string;
          body: string;
          created_at: string;
          id: number;
          post_id: string;
          removed_at: string | null;
        };
        ComputedFields: never;
        Insert: {
          author_id: string;
          body: string;
          created_at?: string;
          id?: never;
          post_id: string;
          removed_at?: string | null;
        };
        Update: {
          author_id?: string;
          body?: string;
          created_at?: string;
          id?: never;
          post_id?: string;
          removed_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "post_comments_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "post_comments_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "posts";
            referencedColumns: ["id"];
          },
        ];
      };
      post_likes: {
        Row: {
          created_at: string;
          post_id: string;
          profile_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          post_id: string;
          profile_id: string;
        };
        Update: {
          created_at?: string;
          post_id?: string;
          profile_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "posts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "post_likes_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      post_photos: {
        Row: {
          path: string;
          position: number;
          post_id: string;
        };
        ComputedFields: never;
        Insert: {
          path: string;
          position: number;
          post_id: string;
        };
        Update: {
          path?: string;
          position?: number;
          post_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "post_photos_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "posts";
            referencedColumns: ["id"];
          },
        ];
      };
      posts: {
        Row: {
          author_id: string;
          caption: string | null;
          created_at: string;
          event_id: string | null;
          hidden_reason: string | null;
          id: string;
          idea_id: string | null;
          status: string;
          visibility: string;
        };
        ComputedFields: never;
        Insert: {
          author_id: string;
          caption?: string | null;
          created_at?: string;
          event_id?: string | null;
          hidden_reason?: string | null;
          id?: string;
          idea_id?: string | null;
          status?: string;
          visibility?: string;
        };
        Update: {
          author_id?: string;
          caption?: string | null;
          created_at?: string;
          event_id?: string | null;
          hidden_reason?: string | null;
          id?: string;
          idea_id?: string | null;
          status?: string;
          visibility?: string;
        };
        Relationships: [
          {
            foreignKeyName: "posts_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "posts_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "posts_idea_id_fkey";
            columns: ["idea_id"];
            isOneToOne: false;
            referencedRelation: "ideas";
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
          terms_accepted_at: string | null;
          terms_version: string | null;
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
          terms_accepted_at?: string | null;
          terms_version?: string | null;
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
          terms_accepted_at?: string | null;
          terms_version?: string | null;
          updated_at?: string;
          visibility?: Database["public"]["Enums"]["profile_visibility"];
        };
        Relationships: [];
      };
      reports: {
        Row: {
          created_at: string;
          details: string | null;
          id: string;
          reason: Database["public"]["Enums"]["report_reason"];
          reporter_id: string;
          resolution_note: string | null;
          resolved_at: string | null;
          resolved_by: string | null;
          status: Database["public"]["Enums"]["report_status"];
          target_id: string;
          target_type: Database["public"]["Enums"]["report_target"];
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          details?: string | null;
          id?: string;
          reason: Database["public"]["Enums"]["report_reason"];
          reporter_id: string;
          resolution_note?: string | null;
          resolved_at?: string | null;
          resolved_by?: string | null;
          status?: Database["public"]["Enums"]["report_status"];
          target_id: string;
          target_type: Database["public"]["Enums"]["report_target"];
        };
        Update: {
          created_at?: string;
          details?: string | null;
          id?: string;
          reason?: Database["public"]["Enums"]["report_reason"];
          reporter_id?: string;
          resolution_note?: string | null;
          resolved_at?: string | null;
          resolved_by?: string | null;
          status?: Database["public"]["Enums"]["report_status"];
          target_id?: string;
          target_type?: Database["public"]["Enums"]["report_target"];
        };
        Relationships: [
          {
            foreignKeyName: "reports_reporter_id_fkey";
            columns: ["reporter_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reports_resolved_by_fkey";
            columns: ["resolved_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      saved_events: {
        Row: {
          created_at: string;
          event_id: string;
          profile_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          event_id: string;
          profile_id: string;
        };
        Update: {
          created_at?: string;
          event_id?: string;
          profile_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "saved_events_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "saved_events_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      saved_ideas: {
        Row: {
          created_at: string;
          idea_id: string;
          profile_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          idea_id: string;
          profile_id: string;
        };
        Update: {
          created_at?: string;
          idea_id?: string;
          profile_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "saved_ideas_idea_id_fkey";
            columns: ["idea_id"];
            isOneToOne: false;
            referencedRelation: "ideas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "saved_ideas_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      space_legal_info: {
        Row: {
          address: string;
          contact_email: string;
          legal_name: string;
          registration_number: string | null;
          space_id: string;
          updated_at: string;
          updated_by: string | null;
        };
        ComputedFields: never;
        Insert: {
          address: string;
          contact_email: string;
          legal_name: string;
          registration_number?: string | null;
          space_id: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          address?: string;
          contact_email?: string;
          legal_name?: string;
          registration_number?: string | null;
          space_id?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "space_legal_info_space_id_fkey";
            columns: ["space_id"];
            isOneToOne: true;
            referencedRelation: "spaces";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "space_legal_info_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
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
      space_posts: {
        Row: {
          author_id: string;
          body: string;
          created_at: string;
          id: string;
          removed_at: string | null;
          space_id: string;
        };
        ComputedFields: never;
        Insert: {
          author_id: string;
          body: string;
          created_at?: string;
          id?: string;
          removed_at?: string | null;
          space_id: string;
        };
        Update: {
          author_id?: string;
          body?: string;
          created_at?: string;
          id?: string;
          removed_at?: string | null;
          space_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "space_posts_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "space_posts_space_id_fkey";
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
          legal_ack_at: string | null;
          legal_ack_by: string | null;
          legal_form: string | null;
          legal_form_v1: string | null;
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
          legal_ack_at?: string | null;
          legal_ack_by?: string | null;
          legal_form?: string | null;
          legal_form_v1?: string | null;
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
          legal_ack_at?: string | null;
          legal_ack_by?: string | null;
          legal_form?: string | null;
          legal_form_v1?: string | null;
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
          {
            foreignKeyName: "spaces_legal_ack_by_fkey";
            columns: ["legal_ack_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      user_blocks: {
        Row: {
          blocked_id: string;
          blocker_id: string;
          created_at: string;
        };
        ComputedFields: never;
        Insert: {
          blocked_id: string;
          blocker_id: string;
          created_at?: string;
        };
        Update: {
          blocked_id?: string;
          blocker_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_blocks_blocked_id_fkey";
            columns: ["blocked_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_blocks_blocker_id_fkey";
            columns: ["blocker_id"];
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
      add_comment: { Args: { p_body: string; p_post: string }; Returns: number };
      add_idea_comment: { Args: { p_body: string; p_idea: string }; Returns: number };
      admin_remove_message: { Args: { p_message: number; p_reason: string }; Returns: undefined };
      admin_resolve_data_request: {
        Args: {
          p_reason: string;
          p_request: string;
          p_status: Database["public"]["Enums"]["data_request_status"];
        };
        Returns: undefined;
      };
      admin_resolve_report: {
        Args: { p_note: string; p_report: string; p_status: Database["public"]["Enums"]["report_status"] };
        Returns: undefined;
      };
      admin_set_idea_status: {
        Args: { p_idea: string; p_reason: string; p_status: string };
        Returns: undefined;
      };
      admin_set_post_status: {
        Args: { p_post: string; p_reason: string; p_status: string };
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
      admin_set_space_verification: {
        Args: {
          p_reason: string;
          p_space: string;
          p_status: Database["public"]["Enums"]["verification_status"];
        };
        Returns: undefined;
      };
      assert_message_rate: { Args: Record<PropertyKey, never>; Returns: undefined };
      block_user: { Args: { p_profile: string }; Returns: undefined };
      book_event: {
        Args: { p_event: string; p_note?: string; p_occurrence: string; p_quantity: number };
        Returns: string;
      };
      can_engage_idea: { Args: { p_idea: string }; Returns: boolean };
      can_message: { Args: { p_to: string }; Returns: boolean };
      can_view_post: { Args: { p_post: string }; Returns: boolean };
      can_view_profile: { Args: { p_profile: string }; Returns: boolean };
      cancel_booking: { Args: { p_booking: string }; Returns: undefined };
      cancel_event: { Args: { p_event: string; p_reason: string }; Returns: undefined };
      cancel_occurrence: { Args: { p_occ: string; p_reason: string }; Returns: number };
      confirm_booking_payment: { Args: { p_booking: string }; Returns: undefined };
      contact_space: { Args: { p_body: string; p_space: string }; Returns: string };
      create_post: {
        Args: {
          p_caption: string;
          p_event?: string;
          p_idea?: string;
          p_no_children: boolean;
          p_paths: string[];
          p_visibility: string;
        };
        Returns: string;
      };
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
      create_space_post: { Args: { p_body: string; p_space: string }; Returns: string };
      dm_open_after: { Args: Record<PropertyKey, never>; Returns: string };
      event_online_url: { Args: { p_event: string }; Returns: string };
      event_space: { Args: { p_event: string }; Returns: string };
      feed_posts: {
        Args: { p_author?: string; p_before?: string; p_limit?: number; p_scope: string };
        Returns: {
          author_handle: string;
          author_id: string;
          author_name: string;
          caption: string;
          comment_count: number;
          created_at: string;
          event_slug: string;
          event_title: string;
          id: string;
          idea_slug: string;
          idea_title: string;
          like_count: number;
          liked_by_me: boolean;
          photos: string[];
          status: string;
          visibility: string;
        }[];
      };
      feed_profile: {
        Args: { p_handle: string };
        Returns: {
          bio: string;
          display_name: string;
          follow_status: string;
          followers: number;
          following: number;
          handle: string;
          id: string;
          is_me: boolean;
          posts: number;
          visibility: string;
        }[];
      };
      follow_user: { Args: { p_profile: string }; Returns: string };
      has_platform_role: {
        Args: { roles: Database["public"]["Enums"]["platform_role"][] };
        Returns: boolean;
      };
      idea_authors: {
        Args: { p_ideas: string[] };
        Returns: {
          display_name: string;
          handle: string;
          idea_id: string;
        }[];
      };
      idea_comments_for: {
        Args: { p_idea: string };
        Returns: {
          author_handle: string;
          author_id: string;
          author_name: string;
          body: string;
          can_remove: boolean;
          created_at: string;
          id: number;
          removed: boolean;
        }[];
      };
      idea_stats: {
        Args: { p_ideas: string[] };
        Returns: {
          comment_count: number;
          idea_id: string;
          like_count: number;
          liked_by_me: boolean;
          my_rating: number;
          rating_avg: number;
          rating_count: number;
        }[];
      };
      insert_message: { Args: { p_body: string; p_conversation: string }; Returns: undefined };
      invite_space_member: {
        Args: { p_handle: string; p_role: Database["public"]["Enums"]["space_role"]; p_space: string };
        Returns: undefined;
      };
      is_active_user: { Args: Record<PropertyKey, never>; Returns: boolean };
      is_blocked_between: { Args: { p_a: string; p_b: string }; Returns: boolean };
      is_conversation_member: { Args: { p_conversation: string }; Returns: boolean };
      is_following: { Args: { p_followee: string }; Returns: boolean };
      is_moderator: { Args: Record<PropertyKey, never>; Returns: boolean };
      is_platform_staff: { Args: Record<PropertyKey, never>; Returns: boolean };
      is_space_role: {
        Args: { min_role: Database["public"]["Enums"]["space_role"]; p_space: string };
        Returns: boolean;
      };
      join_space: { Args: { p_space: string }; Returns: string };
      join_waitlist: {
        Args: { p_event: string; p_occurrence: string; p_quantity: number };
        Returns: undefined;
      };
      leave_space: { Args: { p_space: string }; Returns: undefined };
      leave_waitlist: { Args: { p_event: string; p_occurrence: string }; Returns: undefined };
      mark_conversation_read: { Args: { p_conversation: string }; Returns: undefined };
      mark_notifications_read: { Args: Record<PropertyKey, never>; Returns: undefined };
      notify: {
        Args: { p_body: string; p_kind: string; p_link: string; p_recipient: string; p_title: string };
        Returns: undefined;
      };
      notify_attendees: { Args: { p_event: string; p_message: string }; Returns: number };
      notify_waitlist: { Args: { p_event: string; p_occurrence: string }; Returns: undefined };
      post_comments_for: {
        Args: { p_post: string };
        Returns: {
          author_handle: string;
          author_id: string;
          author_name: string;
          body: string;
          can_remove: boolean;
          created_at: string;
          id: number;
          removed: boolean;
        }[];
      };
      publish_event: { Args: { p_event: string }; Returns: undefined };
      rate_idea: { Args: { p_idea: string; p_stars: number }; Returns: undefined };
      release_overdue_reservations: { Args: { p_event?: string }; Returns: number };
      release_unpaid_booking: { Args: { p_booking: string; p_reason: string }; Returns: undefined };
      remove_comment: { Args: { p_comment: number }; Returns: undefined };
      remove_idea_comment: { Args: { p_comment: number }; Returns: undefined };
      remove_post: { Args: { p_post: string }; Returns: undefined };
      remove_space_member: { Args: { p_profile: string; p_space: string }; Returns: undefined };
      remove_space_post: { Args: { p_post: string }; Returns: undefined };
      report_content: {
        Args: {
          p_details?: string;
          p_reason: Database["public"]["Enums"]["report_reason"];
          p_target: string;
          p_type: Database["public"]["Enums"]["report_target"];
        };
        Returns: string;
      };
      request_space_verification: { Args: { p_space: string }; Returns: undefined };
      reschedule_occurrence: { Args: { p_ends: string; p_occ: string; p_starts: string }; Returns: number };
      respond_follow: { Args: { p_accept: boolean; p_follower: string }; Returns: undefined };
      respond_member_request: {
        Args: { p_accept: boolean; p_profile: string; p_space: string };
        Returns: undefined;
      };
      respond_space_invite: { Args: { p_accept: boolean; p_space: string }; Returns: undefined };
      search_people: {
        Args: { p_query: string };
        Returns: {
          display_name: string;
          follow_status: string;
          handle: string;
          id: string;
          is_me: boolean;
        }[];
      };
      seats_taken: { Args: { p_event: string; p_occurrence: string }; Returns: number };
      send_event_reminders: { Args: Record<PropertyKey, never>; Returns: number };
      send_message: { Args: { p_body: string; p_conversation: string }; Returns: undefined };
      session_bookers: { Args: { p_occ: string }; Returns: string[] };
      set_my_interests: { Args: { p_interest_ids: number[] }; Returns: undefined };
      set_space_legal_info:
        | {
            Args: {
              p_ack: boolean;
              p_address?: string;
              p_email?: string;
              p_form: string;
              p_name?: string;
              p_registration?: string;
              p_space: string;
            };
            Returns: undefined;
          }
        | {
            Args: {
              p_address?: string;
              p_email?: string;
              p_form: string;
              p_name?: string;
              p_registration?: string;
              p_space: string;
            };
            Returns: undefined;
          };
      set_space_member_role: {
        Args: { p_profile: string; p_role: Database["public"]["Enums"]["space_role"]; p_space: string };
        Returns: undefined;
      };
      space_member_count: { Args: { p_space: string }; Returns: number };
      space_role_rank: { Args: { r: Database["public"]["Enums"]["space_role"] }; Returns: number };
      start_conversation: { Args: { p_body: string; p_to: string }; Returns: string };
      toggle_idea_like: { Args: { p_idea: string }; Returns: boolean };
      toggle_like: { Args: { p_post: string }; Returns: boolean };
      unblock_user: { Args: { p_profile: string }; Returns: undefined };
      unfollow_user: { Args: { p_profile: string }; Returns: undefined };
      unread_conversations: { Args: Record<PropertyKey, never>; Returns: number };
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
      booking_scope: "series" | "occurrence";
      booking_status: "confirmed" | "cancelled_by_user" | "cancelled_by_organizer";
      cancellation_policy: "flexible" | "moderate" | "strict";
      consent_kind: "marketing_email" | "push" | "approx_location";
      data_request_kind: "export" | "deletion";
      data_request_status: "open" | "in_progress" | "done" | "rejected";
      event_schedule: "one_off" | "multi_session" | "recurring";
      event_status: "draft" | "published" | "cancelled";
      event_visibility: "public" | "unlisted" | "members";
      membership_mode: "none" | "open" | "approval";
      membership_status: "pending" | "active" | "removed";
      occurrence_status: "scheduled" | "cancelled";
      platform_role: "super_admin" | "admin" | "moderator" | "finance" | "support";
      profile_visibility: "public" | "members" | "private";
      registration_mode: "native" | "external";
      report_reason: "spam" | "harassment" | "inappropriate" | "scam" | "copyright" | "other";
      report_status: "open" | "actioned" | "dismissed";
      report_target: "profile" | "message" | "event" | "space" | "idea" | "post" | "comment" | "idea_comment";
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
      booking_scope: ["series", "occurrence"],
      booking_status: ["confirmed", "cancelled_by_user", "cancelled_by_organizer"],
      cancellation_policy: ["flexible", "moderate", "strict"],
      consent_kind: ["marketing_email", "push", "approx_location"],
      data_request_kind: ["export", "deletion"],
      data_request_status: ["open", "in_progress", "done", "rejected"],
      event_schedule: ["one_off", "multi_session", "recurring"],
      event_status: ["draft", "published", "cancelled"],
      event_visibility: ["public", "unlisted", "members"],
      membership_mode: ["none", "open", "approval"],
      membership_status: ["pending", "active", "removed"],
      occurrence_status: ["scheduled", "cancelled"],
      platform_role: ["super_admin", "admin", "moderator", "finance", "support"],
      profile_visibility: ["public", "members", "private"],
      registration_mode: ["native", "external"],
      report_reason: ["spam", "harassment", "inappropriate", "scam", "copyright", "other"],
      report_status: ["open", "actioned", "dismissed"],
      report_target: ["profile", "message", "event", "space", "idea", "post", "comment", "idea_comment"],
      space_kind: ["solo_creator", "community", "studio", "association"],
      space_role: ["owner", "admin", "staff", "member"],
      verification_status: ["unverified", "pending", "verified", "rejected"],
    },
  },
} as const;
