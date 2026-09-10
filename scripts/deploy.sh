#!/usr/bin/env bash
# Deploy Sparbird to Cloud Run.
#
# First time:   scripts/deploy.sh            (enables APIs, builds, creates the service)
# After that:   scripts/deploy.sh            (builds a new image and rolls it out)
#
# The public service runs in dry-run mode on purpose: no CALL-E key, no owner number, so it can
# never ring anyone. Live calls are for your own machine.
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

echo "deploying"
gcloud run deploy "$SERVICE" --project "$PROJECT" --region "$REGION" --image "$IMAGE" \
  --allow-unauthenticated --memory 512Mi --cpu 1 --timeout 300 --max-instances 3 \
  --set-env-vars "NODE_ENV=production,SPARBIRD_EPHEMERAL=1,SPARBIRD_SEED=1" --quiet

URL="$(gcloud run services describe "$SERVICE" --project "$PROJECT" --region "$REGION" --format='value(status.url)')"
echo "live: $URL"
curl -s -o /dev/null -w 'front page %{http_code}\n' "$URL/"
