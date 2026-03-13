-- Add chat messages table
CREATE TABLE chat_messages (
    id BIGSERIAL PRIMARY KEY,
    sender_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    type VARCHAR(20) DEFAULT 'CHAT',
    read BOOLEAN DEFAULT FALSE,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_sender_receiver CHECK (sender_id != receiver_id)
);

-- Indexes for chat queries
CREATE INDEX idx_chat_sender ON chat_messages(sender_id);
CREATE INDEX idx_chat_receiver ON chat_messages(receiver_id);
CREATE INDEX idx_chat_timestamp ON chat_messages(timestamp);
CREATE INDEX idx_chat_unread ON chat_messages(receiver_id, read);