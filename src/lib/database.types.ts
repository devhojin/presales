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
      announcement_bookmarks: {
        Row: {
          announcement_id: string
          created_at: string | null
          end_date: string | null
          excerpt: string | null
          snapshot_at: string | null
          source: string | null
          source_name: string | null
          title: string | null
          url: string | null
          user_id: string
        }
        Insert: {
          announcement_id: string
          created_at?: string | null
          end_date?: string | null
          excerpt?: string | null
          snapshot_at?: string | null
          source?: string | null
          source_name?: string | null
          title?: string | null
          url?: string | null
          user_id: string
        }
        Update: {
          announcement_id?: string
          created_at?: string | null
          end_date?: string | null
          excerpt?: string | null
          snapshot_at?: string | null
          source?: string | null
          source_name?: string | null
          title?: string | null
          url?: string | null
          user_id?: string
        }
        Relationships: []
      }
      announcement_logs: {
        Row: {
          action: string
          announcement_id: string | null
          announcement_title: string | null
          created_at: string | null
          detail: string | null
          id: string
          source: string | null
        }
        Insert: {
          action: string
          announcement_id?: string | null
          announcement_title?: string | null
          created_at?: string | null
          detail?: string | null
          id?: string
          source?: string | null
        }
        Update: {
          action?: string
          announcement_id?: string | null
          announcement_title?: string | null
          created_at?: string | null
          detail?: string | null
          id?: string
          source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "announcement_logs_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
        ]
      }
      announcement_reads: {
        Row: {
          announcement_id: string
          read_at: string | null
          user_id: string
        }
        Insert: {
          announcement_id: string
          read_at?: string | null
          user_id: string
        }
        Update: {
          announcement_id?: string
          read_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      announcements: {
        Row: {
          age_ranges: string[] | null
          application_method: string | null
          budget: string | null
          business_years: string[] | null
          contact: string | null
          created_at: string | null
          department: string | null
          description: string | null
          eligibility: string | null
          end_date: string | null
          external_id: string | null
          field: string | null
          governing_body: string | null
          id: string
          is_published: boolean | null
          matching_keywords: string[] | null
          organization: string | null
          regions: string[] | null
          source: string | null
          source_url: string | null
          start_date: string | null
          status: string | null
          support_areas: string[] | null
          target: string | null
          target_types: string[] | null
          title: string
          type: string | null
          updated_at: string | null
        }
        Insert: {
          age_ranges?: string[] | null
          application_method?: string | null
          budget?: string | null
          business_years?: string[] | null
          contact?: string | null
          created_at?: string | null
          department?: string | null
          description?: string | null
          eligibility?: string | null
          end_date?: string | null
          external_id?: string | null
          field?: string | null
          governing_body?: string | null
          id?: string
          is_published?: boolean | null
          matching_keywords?: string[] | null
          organization?: string | null
          regions?: string[] | null
          source?: string | null
          source_url?: string | null
          start_date?: string | null
          status?: string | null
          support_areas?: string[] | null
          target?: string | null
          target_types?: string[] | null
          title: string
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          age_ranges?: string[] | null
          application_method?: string | null
          budget?: string | null
          business_years?: string[] | null
          contact?: string | null
          created_at?: string | null
          department?: string | null
          description?: string | null
          eligibility?: string | null
          end_date?: string | null
          external_id?: string | null
          field?: string | null
          governing_body?: string | null
          id?: string
          is_published?: boolean | null
          matching_keywords?: string[] | null
          organization?: string | null
          regions?: string[] | null
          source?: string | null
          source_url?: string | null
          start_date?: string | null
          status?: string | null
          support_areas?: string[] | null
          target?: string | null
          target_types?: string[] | null
          title?: string
          type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      blocked_announcements: {
        Row: {
          created_at: string | null
          external_id: string
          reason: string | null
          title: string | null
        }
        Insert: {
          created_at?: string | null
          external_id: string
          reason?: string | null
          title?: string | null
        }
        Update: {
          created_at?: string | null
          external_id?: string
          reason?: string | null
          title?: string | null
        }
        Relationships: []
      }
      blocked_community_posts: {
        Row: {
          blocked_at: string | null
          blocked_by: string | null
          external_id: string
          id: string
          reason: string | null
          source: string
          title: string | null
        }
        Insert: {
          blocked_at?: string | null
          blocked_by?: string | null
          external_id: string
          id?: string
          reason?: string | null
          source: string
          title?: string | null
        }
        Update: {
          blocked_at?: string | null
          blocked_by?: string | null
          external_id?: string
          id?: string
          reason?: string | null
          source?: string
          title?: string | null
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          author: string | null
          category: string | null
          content_html: string
          created_at: string | null
          excerpt: string | null
          id: number
          is_published: boolean | null
          published_at: string | null
          slug: string
          tags: string[] | null
          thumbnail_url: string | null
          title: string
          updated_at: string | null
          view_count: number | null
        }
        Insert: {
          author?: string | null
          category?: string | null
          content_html: string
          created_at?: string | null
          excerpt?: string | null
          id?: number
          is_published?: boolean | null
          published_at?: string | null
          slug: string
          tags?: string[] | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string | null
          view_count?: number | null
        }
        Update: {
          author?: string | null
          category?: string | null
          content_html?: string
          created_at?: string | null
          excerpt?: string | null
          id?: number
          is_published?: boolean | null
          published_at?: string | null
          slug?: string
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string | null
          view_count?: number | null
        }
        Relationships: []
      }
      brief_items: {
        Row: {
          announcement_id: string | null
          brief_id: number
          category: string | null
          created_at: string
          id: number
          item_type: string
          pub_date: string | null
          snippet: string | null
          sort_order: number
          source: string | null
          title: string
          url: string | null
        }
        Insert: {
          announcement_id?: string | null
          brief_id: number
          category?: string | null
          created_at?: string
          id?: number
          item_type: string
          pub_date?: string | null
          snippet?: string | null
          sort_order?: number
          source?: string | null
          title: string
          url?: string | null
        }
        Update: {
          announcement_id?: string | null
          brief_id?: number
          category?: string | null
          created_at?: string
          id?: number
          item_type?: string
          pub_date?: string | null
          snippet?: string | null
          sort_order?: number
          source?: string | null
          title?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brief_items_brief_id_fkey"
            columns: ["brief_id"]
            isOneToOne: false
            referencedRelation: "daily_briefs"
            referencedColumns: ["id"]
          },
        ]
      }
      brief_subscribers: {
        Row: {
          email: string
          id: number
          last_sent_at: string | null
          name: string | null
          send_count: number
          source: string | null
          status: string
          subscribed_at: string
          token: string
          unsubscribed_at: string | null
        }
        Insert: {
          email: string
          id?: number
          last_sent_at?: string | null
          name?: string | null
          send_count?: number
          source?: string | null
          status?: string
          subscribed_at?: string
          token: string
          unsubscribed_at?: string | null
        }
        Update: {
          email?: string
          id?: number
          last_sent_at?: string | null
          name?: string | null
          send_count?: number
          source?: string | null
          status?: string
          subscribed_at?: string
          token?: string
          unsubscribed_at?: string | null
        }
        Relationships: []
      }
      cart_items: {
        Row: {
          created_at: string | null
          id: number
          product_id: number
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: number
          product_id: number
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: number
          product_id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string | null
          id: number
          name: string
          slug: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          name: string
          slug: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string | null
          id?: number
          name?: string
          slug?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string | null
          created_at: string | null
          file_name: string | null
          file_size: number | null
          file_type: string | null
          file_url: string | null
          id: string
          is_read: boolean | null
          message_type: string
          metadata: Json | null
          room_id: string
          sender_id: string
          sender_type: string
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          file_name?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          is_read?: boolean | null
          message_type?: string
          metadata?: Json | null
          room_id: string
          sender_id: string
          sender_type: string
        }
        Update: {
          content?: string | null
          created_at?: string | null
          file_name?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          is_read?: boolean | null
          message_type?: string
          metadata?: Json | null
          room_id?: string
          sender_id?: string
          sender_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_payment_requests: {
        Row: {
          admin_id: string
          amount: number
          cancelled_at: string | null
          created_at: string | null
          description: string | null
          id: string
          message_id: string | null
          order_id: number | null
          paid_at: string | null
          room_id: string
          status: string
          title: string
          user_id: string
        }
        Insert: {
          admin_id: string
          amount: number
          cancelled_at?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          message_id?: string | null
          order_id?: number | null
          paid_at?: string | null
          room_id: string
          status?: string
          title: string
          user_id: string
        }
        Update: {
          admin_id?: string
          amount?: number
          cancelled_at?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          message_id?: string | null
          order_id?: number | null
          paid_at?: string | null
          room_id?: string
          status?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_payment_requests_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_payment_requests_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_rooms: {
        Row: {
          admin_unread_count: number
          created_at: string | null
          guest_id: string | null
          guest_name: string | null
          hidden_by_admin: boolean
          id: string
          last_message: string | null
          last_message_at: string | null
          room_type: string
          status: string
          updated_at: string | null
          user_id: string | null
          user_unread_count: number
        }
        Insert: {
          admin_unread_count?: number
          created_at?: string | null
          guest_id?: string | null
          guest_name?: string | null
          hidden_by_admin?: boolean
          id?: string
          last_message?: string | null
          last_message_at?: string | null
          room_type?: string
          status?: string
          updated_at?: string | null
          user_id?: string | null
          user_unread_count?: number
        }
        Update: {
          admin_unread_count?: number
          created_at?: string | null
          guest_id?: string | null
          guest_name?: string | null
          hidden_by_admin?: boolean
          id?: string
          last_message?: string | null
          last_message_at?: string | null
          room_type?: string
          status?: string
          updated_at?: string | null
          user_id?: string | null
          user_unread_count?: number
        }
        Relationships: []
      }
      community_posts: {
        Row: {
          attachments: Json | null
          author_avatar: string | null
          author_name: string | null
          author_role: string | null
          category: string
          content: string | null
          created_at: string | null
          created_by: string | null
          external_id: string | null
          external_url: string | null
          id: string
          is_published: boolean | null
          likes: number | null
          source: string | null
          source_name: string | null
          status: string | null
          title: string
          updated_at: string | null
          views: number | null
        }
        Insert: {
          attachments?: Json | null
          author_avatar?: string | null
          author_name?: string | null
          author_role?: string | null
          category?: string
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          external_id?: string | null
          external_url?: string | null
          id?: string
          is_published?: boolean | null
          likes?: number | null
          source?: string | null
          source_name?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
          views?: number | null
        }
        Update: {
          attachments?: Json | null
          author_avatar?: string | null
          author_name?: string | null
          author_role?: string | null
          category?: string
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          external_id?: string | null
          external_url?: string | null
          id?: string
          is_published?: boolean | null
          likes?: number | null
          source?: string | null
          source_name?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
          views?: number | null
        }
        Relationships: []
      }
      consulting_packages: {
        Row: {
          created_at: string | null
          description: string | null
          features: string[] | null
          id: number
          is_best: boolean | null
          is_published: boolean | null
          name: string
          price: string
          price_unit: string | null
          slug: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          features?: string[] | null
          id?: number
          is_best?: boolean | null
          is_published?: boolean | null
          name: string
          price: string
          price_unit?: string | null
          slug: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          features?: string[] | null
          id?: number
          is_best?: boolean | null
          is_published?: boolean | null
          name?: string
          price?: string
          price_unit?: string | null
          slug?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      consulting_requests: {
        Row: {
          company: string | null
          created_at: string | null
          email: string
          id: number
          message: string | null
          name: string
          package_type: string
          phone: string | null
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          company?: string | null
          created_at?: string | null
          email: string
          id?: number
          message?: string | null
          name: string
          package_type: string
          phone?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          company?: string | null
          created_at?: string | null
          email?: string
          id?: number
          message?: string | null
          name?: string
          package_type?: string
          phone?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      coupon_uses: {
        Row: {
          applied_amount: number
          coupon_id: string
          created_at: string
          id: number
          order_id: number | null
          user_id: string | null
        }
        Insert: {
          applied_amount?: number
          coupon_id: string
          created_at?: string
          id?: number
          order_id?: number | null
          user_id?: string | null
        }
        Update: {
          applied_amount?: number
          coupon_id?: string
          created_at?: string
          id?: number
          order_id?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coupon_uses_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_uses_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          code: string
          created_at: string
          description: string | null
          discount_type: string
          discount_value: number
          id: string
          is_active: boolean
          max_usage: number | null
          min_order_amount: number | null
          name: string | null
          usage_count: number
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          discount_type: string
          discount_value: number
          id?: string
          is_active?: boolean
          max_usage?: number | null
          min_order_amount?: number | null
          name?: string | null
          usage_count?: number
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          id?: string
          is_active?: boolean
          max_usage?: number | null
          min_order_amount?: number | null
          name?: string | null
          usage_count?: number
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: []
      }
      daily_briefs: {
        Row: {
          brief_date: string
          created_at: string
          email_html: string
          email_text: string | null
          id: number
          is_published: boolean
          sent_at: string | null
          sent_count: number
          slug: string
          subject: string
          summary: string | null
          total_announcements: number
          total_news: number
        }
        Insert: {
          brief_date: string
          created_at?: string
          email_html: string
          email_text?: string | null
          id?: number
          is_published?: boolean
          sent_at?: string | null
          sent_count?: number
          slug: string
          subject: string
          summary?: string | null
          total_announcements?: number
          total_news?: number
        }
        Update: {
          brief_date?: string
          created_at?: string
          email_html?: string
          email_text?: string | null
          id?: number
          is_published?: boolean
          sent_at?: string | null
          sent_count?: number
          slug?: string
          subject?: string
          summary?: string | null
          total_announcements?: number
          total_news?: number
        }
        Relationships: []
      }
      download_logs: {
        Row: {
          downloaded_at: string | null
          file_name: string | null
          id: number
          product_id: number
          user_id: string
        }
        Insert: {
          downloaded_at?: string | null
          file_name?: string | null
          id?: number
          product_id: number
          user_id: string
        }
        Update: {
          downloaded_at?: string | null
          file_name?: string | null
          id?: number
          product_id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "download_logs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      faq_categories: {
        Row: {
          created_at: string
          icon: string
          id: number
          is_active: boolean
          name: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          icon?: string
          id?: number
          is_active?: boolean
          name: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          icon?: string
          id?: number
          is_active?: boolean
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      faqs: {
        Row: {
          answer: string
          category_id: number
          created_at: string
          id: number
          is_active: boolean
          question: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          answer: string
          category_id: number
          created_at?: string
          id?: number
          is_active?: boolean
          question: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          answer?: string
          category_id?: number
          created_at?: string
          id?: number
          is_active?: boolean
          question?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "faqs_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "faq_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      feed_bookmarks: {
        Row: {
          created_at: string | null
          excerpt: string | null
          post_id: string
          snapshot_at: string | null
          source: string | null
          source_name: string | null
          title: string | null
          url: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          excerpt?: string | null
          post_id: string
          snapshot_at?: string | null
          source?: string | null
          source_name?: string | null
          title?: string | null
          url?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          excerpt?: string | null
          post_id?: string
          snapshot_at?: string | null
          source?: string | null
          source_name?: string | null
          title?: string | null
          url?: string | null
          user_id?: string
        }
        Relationships: []
      }
      feed_logs: {
        Row: {
          action: string
          created_at: string | null
          detail: string | null
          id: string
          post_id: string | null
          post_title: string | null
          source_name: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          detail?: string | null
          id?: string
          post_id?: string | null
          post_title?: string | null
          source_name?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          detail?: string | null
          id?: string
          post_id?: string | null
          post_title?: string | null
          source_name?: string | null
        }
        Relationships: []
      }
      feed_reads: {
        Row: {
          post_id: string
          read_at: string | null
          user_id: string
        }
        Insert: {
          post_id: string
          read_at?: string | null
          user_id: string
        }
        Update: {
          post_id?: string
          read_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      feed_sources: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          last_fetch_count: number | null
          last_fetched_at: string | null
          name: string
          source_type: string | null
          updated_at: string | null
          url: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          last_fetch_count?: number | null
          last_fetched_at?: string | null
          name: string
          source_type?: string | null
          updated_at?: string | null
          url: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          last_fetch_count?: number | null
          last_fetched_at?: string | null
          name?: string
          source_type?: string | null
          updated_at?: string | null
          url?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string | null
          discount_amount: number | null
          discount_reason: string | null
          discount_source_product_id: number | null
          id: number
          order_id: number
          original_price: number | null
          price: number
          product_id: number
        }
        Insert: {
          created_at?: string | null
          discount_amount?: number | null
          discount_reason?: string | null
          discount_source_product_id?: number | null
          id?: number
          order_id: number
          original_price?: number | null
          price: number
          product_id: number
        }
        Update: {
          created_at?: string | null
          discount_amount?: number | null
          discount_reason?: string | null
          discount_source_product_id?: number | null
          id?: number
          order_id?: number
          original_price?: number | null
          price?: number
          product_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          admin_memo: Json | null
          business_cert_name: string | null
          business_cert_url: string | null
          cancelled_at: string | null
          card_memo: string | null
          coupon_code: string | null
          coupon_discount: number | null
          coupon_id: string | null
          created_at: string | null
          deposit_memo: string | null
          id: number
          order_number: string
          paid_at: string | null
          payment_key: string | null
          payment_method: string | null
          refund_reason: string | null
          reward_discount: number
          status: string | null
          tax_contact_info: string | null
          total_amount: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          admin_memo?: Json | null
          business_cert_name?: string | null
          business_cert_url?: string | null
          cancelled_at?: string | null
          card_memo?: string | null
          coupon_code?: string | null
          coupon_discount?: number | null
          coupon_id?: string | null
          created_at?: string | null
          deposit_memo?: string | null
          id?: number
          order_number: string
          paid_at?: string | null
          payment_key?: string | null
          payment_method?: string | null
          refund_reason?: string | null
          reward_discount?: number
          status?: string | null
          tax_contact_info?: string | null
          total_amount?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          admin_memo?: Json | null
          business_cert_name?: string | null
          business_cert_url?: string | null
          cancelled_at?: string | null
          card_memo?: string | null
          coupon_code?: string | null
          coupon_discount?: number | null
          coupon_id?: string | null
          created_at?: string | null
          deposit_memo?: string | null
          id?: number
          order_number?: string
          paid_at?: string | null
          payment_key?: string | null
          payment_method?: string | null
          refund_reason?: string | null
          reward_discount?: number
          status?: string | null
          tax_contact_info?: string | null
          total_amount?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
        ]
      }
      page_views: {
        Row: {
          created_at: string | null
          id: number
          path: string
          referrer: string | null
          session_id: string | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          path: string
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          path?: string
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      product_discount_matches: {
        Row: {
          created_at: string | null
          discount_amount: number
          discount_type: string
          id: number
          is_active: boolean | null
          source_product_id: number
          target_product_id: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          discount_amount?: number
          discount_type?: string
          id?: number
          is_active?: boolean | null
          source_product_id: number
          target_product_id: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          discount_amount?: number
          discount_type?: string
          id?: number
          is_active?: boolean | null
          source_product_id?: number
          target_product_id?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_discount_matches_source_product_id_fkey"
            columns: ["source_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_discount_matches_target_product_id_fkey"
            columns: ["target_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_files: {
        Row: {
          created_at: string | null
          file_name: string
          file_size: string | null
          file_url: string
          id: number
          product_id: number
        }
        Insert: {
          created_at?: string | null
          file_name: string
          file_size?: string | null
          file_url: string
          id?: number
          product_id: number
        }
        Update: {
          created_at?: string | null
          file_name?: string
          file_size?: string | null
          file_url?: string
          id?: number
          product_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_files_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          admin_memo: string | null
          badge: string | null
          badge_best: boolean | null
          badge_new: boolean | null
          badge_sale: boolean | null
          category_id: number | null
          category_ids: number[] | null
          created_at: string | null
          description: string | null
          description_html: string | null
          document_orientation: string | null
          download_count: number | null
          features: Json | null
          file_size: string | null
          file_types: Json | null
          format: string | null
          id: number
          is_free: boolean | null
          is_published: boolean | null
          original_price: number | null
          overview: Json | null
          pages: number | null
          preview_blur_pages: number | null
          preview_clear_pages: number | null
          preview_images: string[] | null
          preview_note: string | null
          preview_pdf_url: string | null
          price: number
          related_product_ids: number[] | null
          review_avg: number | null
          review_count: number | null
          seller: string | null
          sort_order: number | null
          spec: Json | null
          specs: Json | null
          tags: string[] | null
          thumbnail_url: string | null
          tier: string | null
          title: string
          updated_at: string | null
          youtube_id: string | null
        }
        Insert: {
          admin_memo?: string | null
          badge?: string | null
          badge_best?: boolean | null
          badge_new?: boolean | null
          badge_sale?: boolean | null
          category_id?: number | null
          category_ids?: number[] | null
          created_at?: string | null
          description?: string | null
          description_html?: string | null
          document_orientation?: string | null
          download_count?: number | null
          features?: Json | null
          file_size?: string | null
          file_types?: Json | null
          format?: string | null
          id?: number
          is_free?: boolean | null
          is_published?: boolean | null
          original_price?: number | null
          overview?: Json | null
          pages?: number | null
          preview_blur_pages?: number | null
          preview_clear_pages?: number | null
          preview_images?: string[] | null
          preview_note?: string | null
          preview_pdf_url?: string | null
          price?: number
          related_product_ids?: number[] | null
          review_avg?: number | null
          review_count?: number | null
          seller?: string | null
          sort_order?: number | null
          spec?: Json | null
          specs?: Json | null
          tags?: string[] | null
          thumbnail_url?: string | null
          tier?: string | null
          title: string
          updated_at?: string | null
          youtube_id?: string | null
        }
        Update: {
          admin_memo?: string | null
          badge?: string | null
          badge_best?: boolean | null
          badge_new?: boolean | null
          badge_sale?: boolean | null
          category_id?: number | null
          category_ids?: number[] | null
          created_at?: string | null
          description?: string | null
          description_html?: string | null
          document_orientation?: string | null
          download_count?: number | null
          features?: Json | null
          file_size?: string | null
          file_types?: Json | null
          format?: string | null
          id?: number
          is_free?: boolean | null
          is_published?: boolean | null
          original_price?: number | null
          overview?: Json | null
          pages?: number | null
          preview_blur_pages?: number | null
          preview_clear_pages?: number | null
          preview_images?: string[] | null
          preview_note?: string | null
          preview_pdf_url?: string | null
          price?: number
          related_product_ids?: number[] | null
          review_avg?: number | null
          review_count?: number | null
          seller?: string | null
          sort_order?: number | null
          spec?: Json | null
          specs?: Json | null
          tags?: string[] | null
          thumbnail_url?: string | null
          tier?: string | null
          title?: string
          updated_at?: string | null
          youtube_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          admin_memo: string | null
          company: string | null
          created_at: string | null
          email: string
          id: string
          login_failed_count: number
          login_locked_until: string | null
          marketing_opt_in: boolean | null
          marketing_opt_in_at: string | null
          name: string | null
          phone: string | null
          reward_balance: number
          role: string | null
          updated_at: string | null
        }
        Insert: {
          admin_memo?: string | null
          company?: string | null
          created_at?: string | null
          email: string
          id: string
          login_failed_count?: number
          login_locked_until?: string | null
          marketing_opt_in?: boolean | null
          marketing_opt_in_at?: string | null
          name?: string | null
          phone?: string | null
          reward_balance?: number
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          admin_memo?: string | null
          company?: string | null
          created_at?: string | null
          email?: string
          id?: string
          login_failed_count?: number
          login_locked_until?: string | null
          marketing_opt_in?: boolean | null
          marketing_opt_in_at?: string | null
          name?: string | null
          phone?: string | null
          reward_balance?: number
          role?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      reward_point_ledger: {
        Row: {
          amount: number
          balance_after: number
          created_at: string
          id: number
          memo: string | null
          order_id: number | null
          review_id: number | null
          source_key: string
          status: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          balance_after: number
          created_at?: string
          id?: number
          memo?: string | null
          order_id?: number | null
          review_id?: number | null
          source_key: string
          status?: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          created_at?: string
          id?: number
          memo?: string | null
          order_id?: number | null
          review_id?: number | null
          source_key?: string
          status?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reward_point_ledger_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reward_point_ledger_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      review_helpful: {
        Row: {
          created_at: string | null
          id: number
          review_id: number
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: number
          review_id: number
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: number
          review_id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_helpful_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          admin_reply: string | null
          cons: string | null
          content: string
          created_at: string | null
          helpful_count: number | null
          id: number
          image_urls: string[] | null
          is_published: boolean | null
          is_verified_purchase: boolean | null
          product_id: number
          pros: string | null
          rating: number
          reviewer_email: string | null
          reviewer_name: string | null
          title: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          admin_reply?: string | null
          cons?: string | null
          content: string
          created_at?: string | null
          helpful_count?: number | null
          id?: number
          image_urls?: string[] | null
          is_published?: boolean | null
          is_verified_purchase?: boolean | null
          product_id: number
          pros?: string | null
          rating: number
          reviewer_email?: string | null
          reviewer_name?: string | null
          title?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          admin_reply?: string | null
          cons?: string | null
          content?: string
          created_at?: string | null
          helpful_count?: number | null
          id?: number
          image_urls?: string[] | null
          is_published?: boolean | null
          is_verified_purchase?: boolean | null
          product_id?: number
          pros?: string | null
          rating?: number
          reviewer_email?: string | null
          reviewer_name?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      site_settings: {
        Row: {
          key: string
          updated_at: string | null
          value: string
        }
        Insert: {
          key: string
          updated_at?: string | null
          value: string
        }
        Update: {
          key?: string
          updated_at?: string | null
          value?: string
        }
        Relationships: []
      }
      team_members: {
        Row: {
          career: string[] | null
          created_at: string | null
          expertise: string[] | null
          id: number
          image_url: string | null
          is_published: boolean | null
          name: string
          role: string
          sort_order: number | null
        }
        Insert: {
          career?: string[] | null
          created_at?: string | null
          expertise?: string[] | null
          id?: number
          image_url?: string | null
          is_published?: boolean | null
          name: string
          role: string
          sort_order?: number | null
        }
        Update: {
          career?: string[] | null
          created_at?: string | null
          expertise?: string[] | null
          id?: number
          image_url?: string | null
          is_published?: boolean | null
          name?: string
          role?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      user_coupons: {
        Row: {
          coupon_id: string
          id: number
          received_at: string
          source: string
          used_at: string | null
          used_order_id: number | null
          user_id: string
        }
        Insert: {
          coupon_id: string
          id?: number
          received_at?: string
          source?: string
          used_at?: string | null
          used_order_id?: number | null
          user_id: string
        }
        Update: {
          coupon_id?: string
          id?: number
          received_at?: string
          source?: string
          used_at?: string | null
          used_order_id?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_coupons_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_coupons_used_order_id_fkey"
            columns: ["used_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      members_with_stats: {
        Row: {
          admin_memo: string | null
          company: string | null
          created_at: string | null
          email: string | null
          id: string | null
          name: string | null
          order_count: number | null
          phone: string | null
          review_count: number | null
          role: string | null
          total_spent: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      confirm_reward_points: {
        Args: { p_order_id: number }
        Returns: Json
      }
      decrement_helpful: { Args: { rid: number }; Returns: undefined }
      grant_reward_points: {
        Args: {
          p_amount: number
          p_memo?: string | null
          p_order_id?: number | null
          p_review_id?: number | null
          p_source_key: string
          p_type: string
          p_user_id: string
        }
        Returns: Json
      }
      increment_helpful: { Args: { rid: number }; Returns: undefined }
      is_admin: { Args: never; Returns: boolean }
      nextval_guest_name: { Args: never; Returns: number }
      reserve_reward_points: {
        Args: { p_amount: number; p_order_id: number; p_user_id: string }
        Returns: Json
      }
      rollback_reward_points: {
        Args: { p_order_id: number }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
