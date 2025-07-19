#!/bin/sh
# MinIO bucket setup script for Suara.id development environment

# Wait for MinIO to be ready
echo "Waiting for MinIO to be ready..."
sleep 10

# Configure MinIO client
mc alias set local http://minio:9000 minioadmin minioadmin123

# Create required buckets
echo "Creating S3 buckets for Suara.id..."

# Bucket for user uploads (KTP images, selfies, etc.)
mc mb local/suara-uploads 2>/dev/null || echo "Bucket suara-uploads already exists"

# Bucket for processed files (optimized images, extracted data)
mc mb local/suara-processed 2>/dev/null || echo "Bucket suara-processed already exists"

# Bucket for system backups
mc mb local/suara-backups 2>/dev/null || echo "Bucket suara-backups already exists"

# Set bucket policies for development
echo "Setting bucket policies..."

# Public read policy for processed files (profile pictures, etc.)
cat > /tmp/public-read-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {"AWS": ["*"]},
      "Action": ["s3:GetObject"],
      "Resource": ["arn:aws:s3:::suara-processed/*"]
    }
  ]
}
EOF

mc policy set-json /tmp/public-read-policy.json local/suara-processed

# Private policy for uploads and backups
mc policy set private local/suara-uploads
mc policy set private local/suara-backups

# Create development folders within buckets
echo "Creating folder structure..."

# Upload folders
mc cp /dev/null local/suara-uploads/ktp/.keep
mc cp /dev/null local/suara-uploads/selfies/.keep
mc cp /dev/null local/suara-uploads/documents/.keep

# Processed folders
mc cp /dev/null local/suara-processed/profile-pictures/.keep
mc cp /dev/null local/suara-processed/thumbnails/.keep
mc cp /dev/null local/suara-processed/optimized/.keep

# Backup folders
mc cp /dev/null local/suara-backups/database/.keep
mc cp /dev/null local/suara-backups/logs/.keep

echo "MinIO setup completed successfully!"
echo "Access MinIO Console at: http://localhost:9001"
echo "Username: minioadmin"
echo "Password: minioadmin123"

# List created buckets for verification
echo "Created buckets:"
mc ls local/