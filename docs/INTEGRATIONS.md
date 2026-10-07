# Integrations and account ownership

## Google
The system supports Google OAuth and Google Business Profile integration after the owner authorizes the account. It can manage an authorized Business Profile according to granted scopes.

Creating a new Google account itself is not treated as an autonomous API action: account ownership, identity verification, recovery methods and anti-abuse checks remain human-controlled. The system can provide the setup flow and then connect the authorized account.

## Instagram / Meta
Use Meta OAuth and official APIs for authorized Instagram Business/Creator assets. Publishing and insights depend on the account type, app permissions and Meta review/approval requirements.

## Website
The public Dornelas site remains a separate application. The agent should consume its product/catalog/order data through an explicit integration rather than modifying production code directly.

## Secrets
Credentials and OAuth tokens must never be committed. Store secrets in environment variables or a production secret manager. Tokens must be encrypted at rest and scoped to the minimum permissions needed.
