# BACKLYST MARKETPLACE RUNTIME ARCHITECTURE

## 1. Provider Opportunity Generation Flow

When a provider queries their dashboard, the algorithm executes the following layered flow to guarantee only compliant opportunities are displayed.

```mermaid
sequenceDiagram
    participant Provider as Provider
    participant Controller as ProviderTaskController
    participant Matching as MatchingRelaxationEngine
    participant Validation as ValidationEngine
    participant Ranking as RankingService
    participant DB as PrismaDB

    Provider->>Controller: GET /opportunities
    Controller->>Matching: requestMatches(providerId)
    Matching->>DB: Fetch Base Eligible Websites & Placements
    
    rect rgb(200, 220, 250)
    Note over Matching,Validation: Hard Filters & Relaxation
    Matching->>Validation: validateEligibility(Provider, Placement)
    Validation-->>Matching: Return compliant boolean
    end

    Matching->>Ranking: rankOpportunities(validList)
    
    rect rgb(220, 250, 200)
    Note over Ranking: Scoring & Tiers
    Ranking->>Ranking: TIER_PRIORITY_ORDER Sort
    Ranking->>Ranking: Compatibility, Opp, Risk Scores
    end

    Ranking-->>Controller: Sorted Opportunity List
    Controller-->>Provider: Display Results (or Low-Pool Status)
```

## 2. Maintenance and Lifecycle Jobs Flow

The transition to BullMQ centralizes scheduled tasks out of single-instance crons into a scalable background worker mesh.

```mermaid
sequenceDiagram
    participant Redis as BullMQ Redis
    participant Worker as MarketplaceMaintenanceWorker
    participant Services as Internal Scoring Services
    participant DB as PrismaDB

    Redis->>Worker: Dispatch job (e.g. DECAY_BOOST_FACTORS)
    Worker->>Worker: Parse Job Name
    
    alt is scoring update
        Worker->>Services: recomputeAllQuality()
        Services->>DB: Bulk UPSERT scores
    else is override expire
        Worker->>Services: expireOverrides()
        Services->>DB: DELETE where expiresAt < now()
    end
    
    Worker-->>Redis: Ack job completion
```

## 3. Transaction-Safe Assignment Flow (Missing P0 Gap)

```mermaid
sequenceDiagram
    participant Requester as Requester
    participant Valid as ValidationEngine
    participant Tx as Prisma $transaction
    participant Error as ErrorHandler

    Requester->>Valid: Request Assignment
    Valid->>Tx: BEGIN (Serializable isolation)
    Tx->>Tx: SELECT count(...) FOR UPDATE
    
    alt Over Limit
        Tx-->>Error: Throw WeeklyLimitExceeded
        Error-->>Requester: Reject
    else Under Limit
        Tx->>Tx: UPDATE DomainInteraction
        Tx->>Tx: COMMIT
        Tx-->>Requester: Assigned
    end
```
