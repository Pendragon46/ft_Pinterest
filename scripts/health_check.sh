#!/bin/sh

echo "========== HEALTH CHECK =========="

echo ""
echo "Backend:"
curl -fs http://backend:3000/health && echo " OK"

echo ""
echo "Frontend:"
curl -fs http://frontend:5173 >/dev/null && echo " OK"

echo ""
echo "Database:"
pg_isready -h postgres -U "$POSTGRES_USER"

echo ""
echo "=================================="