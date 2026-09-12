#!/usr/bin/env bash
# Deploy Sparbird to Cloud Run.
#
# First time:   scripts/deploy.sh            (enables APIs, builds, creates the service)
# After that:   scripts/deploy.sh            (builds a new image and rolls it out)
#
# By default the service runs in dry-run mode: no CALL-E key, no owner number, so it can never
# ring anyone.
#
# To let it ring YOUR phone and nobody else's:
#
#   LIVE=1 OWNER_E164=+14155550123 scripts/deploy.sh
#
# The key goes to Secret Manager, never to an environment variable. OWNER_E164 locks the service
# to that one phone, and only an account carrying that same number can make it ring, so a visitor
# cannot dial you. Everyone else gets a recorded call, scored the same way.
set -euo pipefail
PROJECT="${PROJECT:-sparbird}"
REGION="${REGION:-us-central1}"
SERVICE="${SERVICE:-sparbird}"
TAG="$(git rev-parse --short HEAD)-$(date -u +%H%M%S)"
REPO="cloud-run-source-deploy"
IMAGE="$REGION-docker.pkg.dev/$PROJECT/$REPO/$SERVICE:$TAG"

echo "project $PROJECT · region $REGION · service $SERVICE"
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com \
  --project "$PROJECT" --quiet

# On a new project, Cloud Build runs as the Compute default service account, which cannot read
# its own staging bucket until it is given the builder role. Idempotent, so it runs every time.
NUMBER="$(gcloud projects describe "$PROJECT" --format='value(projectNumber)')"
gcloud projects add-iam-policy-binding "$PROJECT" \
  --member "serviceAccount:$NUMBER-compute@developer.gserviceaccount.com" \
  --role roles/cloudbuild.builds.builder --quiet >/dev/null

if ! gcloud artifacts repositories describe "$REPO" --project "$PROJECT" --location "$REGION" >/dev/null 2>&1; then
  gcloud artifacts repositories create "$REPO" --project "$PROJECT" --location "$REGION" \
    --repository-format docker --quiet
fi

echo "building $IMAGE"
BUILD_ID="$(gcloud builds submit --project "$PROJECT" --tag "$IMAGE" --async --format='value(id)' .)"
echo "build $BUILD_ID submitted, waiting"
while :; do
  STATUS="$(gcloud builds describe "$BUILD_ID" --project "$PROJECT" --format='value(status)')"
  case "$STATUS" in
    SUCCESS) break ;;
    FAILURE|CANCELLED|TIMEOUT|EXPIRED|INTERNAL_ERROR)
      echo "build $STATUS"; gcloud builds log "$BUILD_ID" --project "$PROJECT" | tail -40; exit 1 ;;
    *) printf '.'; sleep 15 ;;
  esac
done
echo

LIVE_ENV=""
LIVE_SECRETS=""
if [ "${LIVE:-}" = "1" ]; then
  : "${OWNER_E164:?LIVE=1 needs OWNER_E164 set to the phone this service may ring}"
  case "$OWNER_E164" in
    +[1-9]*) ;;
    *) echo "OWNER_E164 must be E.164, like +14155550123"; exit 1 ;;
  esac
  KEY="${CALLE_API_KEY:-$(grep -E '^CALLE_API_KEY=' .env 2>/dev/null | cut -d= -f2- | tr -d ' \r')}"
  [ -n "$KEY" ] || { echo "No CALL-E key. Put CALLE_API_KEY in .env or the environment."; exit 1; }

  gcloud services enable secretmanager.googleapis.com --project "$PROJECT" --quiet
  if ! gcloud secrets describe sparbird-calle-key --project "$PROJECT" >/dev/null 2>&1; then
    gcloud secrets create sparbird-calle-key --project "$PROJECT" --replication-policy automatic --quiet
  fi
  printf '%s' "$KEY" | gcloud secrets versions add sparbird-calle-key --project "$PROJECT" --data-file=- --quiet >/dev/null
  gcloud secrets add-iam-policy-binding sparbird-calle-key --project "$PROJECT" \
    --member "serviceAccount:$NUMBER-compute@developer.gserviceaccount.com" \
    --role roles/secretmanager.secretAccessor --quiet >/dev/null

  LIVE_ENV=",SPARBIRD_LIVE=1,OWNER_E164=$OWNER_E164"
  LIVE_SECRETS=",CALLE_API_KEY=sparbird-calle-key:latest"
  echo "live calling ON, locked to $OWNER_E164"
fi

echo "deploying"
# --set-env-vars replaces the whole environment, so everything the service needs is listed
# here. The session secret lives in Secret Manager: it must outlive a revision, or every
# signed-in person is signed out by the next deploy.
gcloud run deploy "$SERVICE" --project "$PROJECT" --region "$REGION" --image "$IMAGE" \
  --allow-unauthenticated --memory 512Mi --cpu 1 --timeout 900 --max-instances 3 \
  --set-env-vars "NODE_ENV=production,SPARBIRD_EPHEMERAL=1,SPARBIRD_SEED=1$LIVE_ENV" \
  --set-secrets "SPARBIRD_SECRET=sparbird-session-secret:latest$LIVE_SECRETS" --quiet

URL="$(gcloud run services describe "$SERVICE" --project "$PROJECT" --region "$REGION" --format='value(status.url)')"
echo "live: $URL"
curl -s -o /dev/null -w 'front page %{http_code}\n' "$URL/"
