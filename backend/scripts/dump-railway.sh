#!/bin/bash
# Dump Railway database to a downloadable file

echo "📦 Dumping Railway PostgreSQL database..."

# Create dump
pg_dump $DATABASE_URL > /tmp/railway_dump.sql

if [ $? -eq 0 ]; then
    echo "✅ Dump successful!"
    echo "📊 File size:"
    ls -lh /tmp/railway_dump.sql
    echo ""
    echo "💾 To download, run locally:"
    echo "   railway run cat /tmp/railway_dump.sql > railway_dump.sql"
else
    echo "❌ Dump failed"
    exit 1
fi
