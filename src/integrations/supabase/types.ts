export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      doubt_messages: {
        Row: {
          citations: Json | null
          content: string
          created_at: string
          doubt_id: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          citations?: Json | null
          content: string
          created_at?: string
          doubt_id: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          citations?: Json | null
          content?: string
          created_at?: string
          doubt_id?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "doubt_messages_doubt_id_fkey"
            columns: ["doubt_id"]
            isOneToOne: false
            referencedRelation: "doubts"
            referencedColumns: ["id"]
          },
        ]
      }
      bookmarks: {
        Row: {
          created_at: string
          id: string
          note: string | null
          ref_id: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string | null
          ref_id: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          note?: string | null
          ref_id?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      doubts: {
        Row: {
          created_at: string
          id: string
          subject_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          subject_id?: string | null
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          subject_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "doubts_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      formula_sheets: {
        Row: {
          content: string
          created_at: string
          id: string
          subject_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          subject_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          subject_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "formula_sheets_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_documents: {
        Row: {
          chunk_index: number
          content: string
          created_at: string
          embedding: string | null
          id: string
          metadata: Json | null
          source_title: string
          source_url: string | null
          subject_id: string | null
        }
        Insert: {
          chunk_index?: number
          content: string
          created_at?: string
          embedding?: string | null
          id?: string
          metadata?: Json | null
          source_title: string
          source_url?: string | null
          subject_id?: string | null
        }
        Update: {
          chunk_index?: number
          content?: string
          created_at?: string
          embedding?: string | null
          id?: string
          metadata?: Json | null
          source_title?: string
          source_url?: string | null
          subject_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_documents_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      past_questions: {
        Row: {
          created_at: string
          created_by: string | null
          difficulty: string | null
          exam_month: string
          exam_year: number
          id: string
          level: Database["public"]["Enums"]["ca_level"]
          marks: number | null
          official_answer: string | null
          paper: string | null
          question_number: string | null
          question_text: string
          source_url: string | null
          subject_id: string | null
          topic_tags: string[] | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          difficulty?: string | null
          exam_month: string
          exam_year: number
          id?: string
          level: Database["public"]["Enums"]["ca_level"]
          marks?: number | null
          official_answer?: string | null
          paper?: string | null
          question_number?: string | null
          question_text: string
          source_url?: string | null
          subject_id?: string | null
          topic_tags?: string[] | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          difficulty?: string | null
          exam_month?: string
          exam_year?: number
          id?: string
          level?: Database["public"]["Enums"]["ca_level"]
          marks?: number | null
          official_answer?: string | null
          paper?: string | null
          question_number?: string | null
          question_text?: string
          source_url?: string | null
          subject_id?: string | null
          topic_tags?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "past_questions_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          level: Database["public"]["Enums"]["ca_level"] | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id: string
          level?: Database["public"]["Enums"]["ca_level"] | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          level?: Database["public"]["Enums"]["ca_level"] | null
          updated_at?: string
        }
        Relationships: []
      }
      question_answers: {
        Row: {
          answer: string
          citations: Json | null
          created_at: string
          generated_by: string | null
          id: string
          model: string | null
          question_id: string
        }
        Insert: {
          answer: string
          citations?: Json | null
          created_at?: string
          generated_by?: string | null
          id?: string
          model?: string | null
          question_id: string
        }
        Update: {
          answer?: string
          citations?: Json | null
          created_at?: string
          generated_by?: string | null
          id?: string
          model?: string | null
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "past_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      flashcards: {
        Row: {
          created_at: string
          created_by: string | null
          front: string
          back: string
          id: string
          subject_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          front: string
          back: string
          id?: string
          subject_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          front?: string
          back?: string
          id?: string
          subject_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "flashcards_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      flashcard_reviews: {
        Row: {
          ease: number | null
          flashcard_id: string
          id: string
          interval_days: number | null
          last_reviewed: string | null
          next_review: string | null
          reviews_count: number | null
          user_id: string
        }
        Insert: {
          ease?: number | null
          flashcard_id: string
          id?: string
          interval_days?: number | null
          last_reviewed?: string | null
          next_review?: string | null
          reviews_count?: number | null
          user_id: string
        }
        Update: {
          ease?: number | null
          flashcard_id?: string
          id?: string
          interval_days?: number | null
          last_reviewed?: string | null
          next_review?: string | null
          reviews_count?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flashcard_reviews_flashcard_id_fkey"
            columns: ["flashcard_id"]
            isOneToOne: false
            referencedRelation: "flashcards"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_settings: {
        Row: {
          exam_date: string
          id: string
          label: string
          updated_at: string
          user_id: string
        }
        Insert: {
          exam_date: string
          id?: string
          label: string
          updated_at?: string
          user_id: string
        }
        Update: {
          exam_date?: string
          id?: string
          label?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      mock_test_sessions: {
        Row: {
          answers: Json
          attempted: number
          completed_at: string
          correct: number
          id: string
          level: string | null
          question_ids: string[]
          score_pct: number
          subject_id: string | null
          time_taken_seconds: number
          total_questions: number
          user_id: string
        }
        Insert: {
          answers?: Json
          attempted?: number
          completed_at?: string
          correct?: number
          id?: string
          level?: string | null
          question_ids?: string[]
          score_pct?: number
          subject_id?: string | null
          time_taken_seconds?: number
          total_questions?: number
          user_id: string
        }
        Update: {
          answers?: Json
          attempted?: number
          completed_at?: string
          correct?: number
          id?: string
          level?: string | null
          question_ids?: string[]
          score_pct?: number
          subject_id?: string | null
          time_taken_seconds?: number
          total_questions?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mock_test_sessions_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      study_plans: {
        Row: {
          created_at: string
          daily_hours: number
          exam_date: string
          id: string
          level: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          daily_hours?: number
          exam_date: string
          id?: string
          level?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          daily_hours?: number
          exam_date?: string
          id?: string
          level?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      study_sessions: {
        Row: {
          created_at: string
          duration_seconds: number
          id: string
          subject_id: string | null
          topic_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_seconds: number
          id?: string
          subject_id?: string | null
          topic_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          duration_seconds?: number
          id?: string
          subject_id?: string | null
          topic_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_sessions_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_sessions_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      study_streaks: {
        Row: {
          created_at: string
          date: string
          id: string
          minutes: number
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          minutes?: number
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          minutes?: number
          user_id?: string
        }
        Relationships: []
      }
      subjects: {
        Row: {
          code: string | null
          created_at: string
          description: string | null
          id: string
          level: Database["public"]["Enums"]["ca_level"]
          name: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          level: Database["public"]["Enums"]["ca_level"]
          name: string
        }
        Update: {
          code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          level?: Database["public"]["Enums"]["ca_level"]
          name?: string
        }
        Relationships: []
      }
      topics: {
        Row: {
          created_at: string
          description: string | null
          estimated_hours: number | null
          id: string
          order_index: number
          subject_id: string
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          estimated_hours?: number | null
          id?: string
          order_index?: number
          subject_id: string
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          estimated_hours?: number | null
          id?: string
          order_index?: number
          subject_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "topics_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_progress: {
        Row: {
          confidence: number | null
          id: string
          notes: string | null
          status: string
          topic_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          confidence?: number | null
          id?: string
          notes?: string | null
          status?: string
          topic_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          confidence?: number | null
          id?: string
          notes?: string | null
          status?: string
          topic_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_progress_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      match_knowledge: {
        Args: {
          filter_subject?: string
          match_count?: number
          query_embedding: string
        }
        Returns: {
          content: string
          id: string
          similarity: number
          source_title: string
          source_url: string
        }[]
      }
    }
    Enums: {
      app_role: "student" | "teacher" | "admin"
      ca_level: "Foundation" | "Intermediate" | "Final"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["student", "teacher", "admin"],
      ca_level: ["Foundation", "Intermediate", "Final"],
    },
  },
} as const
