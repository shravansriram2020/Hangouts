const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const initDb = async () => {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        profile_photo TEXT,
        location_enabled BOOLEAN DEFAULT false,
        current_lat DOUBLE PRECISION,
        current_lng DOUBLE PRECISION,
        tutorial_completed BOOLEAN DEFAULT false,
        push_token TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        host_id UUID REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        event_image TEXT,
        event_date DATE NOT NULL,
        event_time TIME NOT NULL,
        location_name VARCHAR(255),
        location_address TEXT,
        location_lat DOUBLE PRECISION,
        location_lng DOUBLE PRECISION,
        gradient_color1 VARCHAR(20),
        gradient_color2 VARCHAR(20),
        notes TEXT,
        allow_attendee_sharing BOOLEAN DEFAULT true,
        is_archived BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS event_attendees (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        event_id UUID REFERENCES events(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        status VARCHAR(20) DEFAULT 'invited',
        is_on_my_way BOOLEAN DEFAULT false,
        location_sharing BOOLEAN DEFAULT false,
        current_lat DOUBLE PRECISION,
        current_lng DOUBLE PRECISION,
        joined_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(event_id, user_id)
      );

      CREATE TABLE IF NOT EXISTS conflicts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        event_id UUID REFERENCES events(id) ON DELETE CASCADE,
        reporter_id UUID REFERENCES users(id) ON DELETE CASCADE,
        conflict_type VARCHAR(20) NOT NULL,
        reason TEXT,
        suggested_time TIMESTAMP,
        suggested_location TEXT,
        suggested_lat DOUBLE PRECISION,
        suggested_lng DOUBLE PRECISION,
        is_resolved BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS conflict_votes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        conflict_id UUID REFERENCES conflicts(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        vote VARCHAR(10) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(conflict_id, user_id)
      );

      CREATE TABLE IF NOT EXISTS rides (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        event_id UUID REFERENCES events(id) ON DELETE CASCADE,
        driver_id UUID REFERENCES users(id) ON DELETE CASCADE,
        spots_available INTEGER NOT NULL,
        pickup_location TEXT,
        pickup_lat DOUBLE PRECISION,
        pickup_lng DOUBLE PRECISION,
        can_drive_to BOOLEAN DEFAULT true,
        can_drive_from BOOLEAN DEFAULT true,
        is_cancelled BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS ride_passengers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ride_id UUID REFERENCES rides(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        joined_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(ride_id, user_id)
      );

      CREATE TABLE IF NOT EXISTS money_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        event_id UUID REFERENCES events(id) ON DELETE CASCADE,
        requester_id UUID REFERENCES users(id) ON DELETE CASCADE,
        ower_id UUID REFERENCES users(id) ON DELETE CASCADE,
        amount DECIMAL(10, 2) NOT NULL,
        description TEXT,
        is_paid BOOLEAN DEFAULT false,
        is_cleared BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS event_notes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        event_id UUID REFERENCES events(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        event_id UUID REFERENCES events(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        reply_to_id UUID REFERENCES messages(id) ON DELETE SET NULL,
        has_time_suggestion BOOLEAN DEFAULT false,
        has_location_suggestion BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS event_photos (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        event_id UUID REFERENCES events(id) ON DELETE CASCADE,
        uploader_id UUID REFERENCES users(id) ON DELETE CASCADE,
        photo_url TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '30 days')
      );

      CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT,
        event_id UUID REFERENCES events(id) ON DELETE CASCADE,
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS verification_codes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) NOT NULL,
        code VARCHAR(6) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS friends (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        friend_id UUID REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, friend_id)
      );

      -- Admin portal tables
      CREATE TABLE IF NOT EXISTS admin_users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS admin_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        admin_id UUID REFERENCES admin_users(id) ON DELETE CASCADE,
        token VARCHAR(255) UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS admin_verification_codes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) NOT NULL,
        code VARCHAR(6) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS admin_audit_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        admin_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
        action VARCHAR(100) NOT NULL,
        target_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        details JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      );

      -- Add ban fields to users table if not exists
      ALTER TABLE users ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT false;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS ban_reason TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS ban_expires_at TIMESTAMP;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS banned_by UUID;

      -- News announcements table
      CREATE TABLE IF NOT EXISTS news_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255),
        caption TEXT NOT NULL,
        image_url TEXT,
        is_published BOOLEAN DEFAULT false,
        created_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
        published_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      -- Track which users have dismissed which news items
      CREATE TABLE IF NOT EXISTS news_dismissals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        news_id UUID REFERENCES news_items(id) ON DELETE CASCADE,
        dismissed_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, news_id)
      );

      -- Add explore sharing columns to event_photos
      ALTER TABLE event_photos ADD COLUMN IF NOT EXISTS share_to_explore BOOLEAN DEFAULT false;
      ALTER TABLE event_photos ADD COLUMN IF NOT EXISTS moderation_status VARCHAR(20);
      ALTER TABLE event_photos ADD COLUMN IF NOT EXISTS uploaded_by UUID REFERENCES users(id) ON DELETE CASCADE;
      
      -- Add location data columns to event_photos for explore posts (persists after event deletion)
      ALTER TABLE event_photos ADD COLUMN IF NOT EXISTS location_name TEXT;
      ALTER TABLE event_photos ADD COLUMN IF NOT EXISTS location_address TEXT;
      ALTER TABLE event_photos ADD COLUMN IF NOT EXISTS location_lat DOUBLE PRECISION;
      ALTER TABLE event_photos ADD COLUMN IF NOT EXISTS location_lng DOUBLE PRECISION;
      ALTER TABLE event_photos ADD COLUMN IF NOT EXISTS tomtom_category VARCHAR(100);
      ALTER TABLE event_photos ADD COLUMN IF NOT EXISTS like_count INTEGER DEFAULT 0;
      
      -- Change event_id foreign key from CASCADE to SET NULL so explore posts persist after event deletion
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'event_photos_event_id_fkey' 
          AND table_name = 'event_photos'
        ) THEN
          ALTER TABLE event_photos DROP CONSTRAINT event_photos_event_id_fkey;
          ALTER TABLE event_photos ADD CONSTRAINT event_photos_event_id_fkey 
            FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE SET NULL;
        END IF;
      END $$;
      
      -- Backfill location data for existing shared photos that don't have it yet
      UPDATE event_photos ep
      SET 
        location_name = e.location_name,
        location_address = e.location_address,
        location_lat = e.location_lat,
        location_lng = e.location_lng
      FROM events e
      WHERE ep.event_id = e.id
        AND ep.share_to_explore = true
        AND ep.location_name IS NULL
        AND e.location_name IS NOT NULL;

      -- Saved explore posts table
      CREATE TABLE IF NOT EXISTS saved_explore_posts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        photo_id UUID REFERENCES event_photos(id) ON DELETE CASCADE,
        saved_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, photo_id)
      );
    `);
    console.log('Database tables created successfully');
  } catch (error) {
    console.error('Error creating tables:', error);
    throw error;
  } finally {
    client.release();
  }
};

module.exports = { pool, initDb };
