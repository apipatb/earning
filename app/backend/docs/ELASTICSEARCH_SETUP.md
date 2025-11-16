# Elasticsearch Search Integration

This document describes the Elasticsearch-based advanced search capabilities integrated into the application.

## Features

### Backend Features
- **Full-text search** across multiple entities (tickets, chat messages, customers, documents)
- **Faceted search** with dynamic filters and aggregations
- **Autocomplete/suggestions** for improved user experience
- **Highlighting** of matched search terms in results
- **Auto-indexing** middleware that automatically syncs data changes to Elasticsearch
- **Analytics** using Elasticsearch aggregations
- **Multi-field search** with field boosting for relevance
- **Fuzzy matching** for typo-tolerant search
- **Range queries** for date and numeric fields

### Frontend Features
- **Global search** modal (Cmd/Ctrl+K) searching across all entities
- **Entity-specific search** pages with advanced filtering
- **Real-time autocomplete** suggestions
- **Highlighted search results** showing matched terms
- **Pagination** for large result sets
- **Faceted filtering** with aggregated counts
- **Loading states** and error handling

## Installation & Setup

### 1. Install Elasticsearch

#### Using Docker
```bash
docker run -d \
  --name elasticsearch \
  -p 9200:9200 \
  -p 9300:9300 \
  -e "discovery.type=single-node" \
  -e "xpack.security.enabled=false" \
  docker.elastic.co/elasticsearch/elasticsearch:8.11.0
```

#### Using Homebrew (macOS)
```bash
brew tap elastic/tap
brew install elastic/tap/elasticsearch-full
brew services start elastic/tap/elasticsearch-full
```

### 2. Configure Environment Variables

Add to your `.env` file:

```env
# Elasticsearch Configuration
ELASTICSEARCH_NODE="http://localhost:9200"

# Choose ONE authentication method:
# Option 1: API Key (recommended for production)
ELASTICSEARCH_API_KEY=your_api_key_here

# Option 2: Username/Password
ELASTICSEARCH_USERNAME=elastic
ELASTICSEARCH_PASSWORD=your_password_here
```

### 3. Initialize Indices

The application automatically initializes Elasticsearch indices on startup. Indices are created with optimized mappings for:

- **tickets** - Support tickets with subject, description, tags, status, priority
- **chat_messages** - Chat messages with content, room, sender, timestamp
- **customers** - Customer data with name, email, company, location
- **documents** - Documents with filename, content, tags, metadata

### 4. Verify Installation

Check Elasticsearch health:
```bash
curl http://localhost:9200/_cluster/health
```

Or use the API endpoint:
```bash
curl http://localhost:3001/api/v1/search/health \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## API Endpoints

### Global Search
Search across all indices:
```
GET /api/v1/search?q=query&from=0&size=20
```

### Entity-Specific Search

#### Search Tickets
```
GET /api/v1/search/tickets?q=query&status=OPEN&priority=HIGH&facets[]=status&facets[]=priority
```

#### Search Messages
```
GET /api/v1/search/messages?q=query&roomId=room-id&dateFrom=2024-01-01
```

#### Search Customers
```
GET /api/v1/search/customers?q=query&city=NewYork&country=USA&isActive=true
```

#### Search Documents
```
GET /api/v1/search/documents?q=query&contentType=pdf&tags[]=invoice
```

### Autocomplete
```
GET /api/v1/search/suggestions?q=query&field=subject&index=tickets&size=10
```

### Analytics
```
GET /api/v1/search/analytics?index=tickets
```

### Health Check
```
GET /api/v1/search/health
```

### Reindex (Admin)
```
POST /api/v1/search/reindex
```

## Auto-Indexing

The application includes middleware that automatically syncs data to Elasticsearch when you create, update, or delete entities.

### Example Usage in Routes

```typescript
import { captureResponseBody, indexTicket, updateTicket, deleteTicket } from '../middleware/elasticsearch-sync.middleware';

// Apply middleware to routes
router.post('/', captureResponseBody, createTicket, indexTicket);
router.put('/:id', captureResponseBody, updateTicket, updateTicket);
router.delete('/:id', deleteTicket);
```

## Frontend Usage

### Global Search Component

The global search modal can be triggered with `Cmd+K` (Mac) or `Ctrl+K` (Windows/Linux):

```tsx
import GlobalSearch from './components/GlobalSearch';

function App() {
  return (
    <>
      <GlobalSearch />
      {/* rest of your app */}
    </>
  );
}
```

### Entity-Specific Search

Use the SearchResults component for dedicated search pages:

```tsx
import SearchResults from './components/SearchResults';

function TicketsSearchPage() {
  return (
    <SearchResults
      index="tickets"
      initialQuery=""
      onResultClick={(ticket) => {
        // Navigate to ticket detail
        navigate(`/tickets/${ticket.id}`);
      }}
    />
  );
}
```

### Using Hooks Directly

```tsx
import { useGlobalSearch, useEntitySearch } from './hooks/useElasticsearch';

function MyComponent() {
  const {
    query,
    results,
    loading,
    error,
    handleSearch,
  } = useGlobalSearch({
    debounceDelay: 300,
    minChars: 2,
    autoSearch: true,
  });

  return (
    <input
      value={query}
      onChange={(e) => handleSearch(e.target.value)}
    />
  );
}
```

## Performance Considerations

### Index Settings
- **Shards**: 1 shard per index (suitable for small to medium datasets)
- **Replicas**: 1 replica for high availability
- **Refresh**: `wait_for` ensures data is searchable immediately

### Query Optimization
- **Field boosting**: More important fields get higher weight (e.g., `subject^3`)
- **Fuzzy matching**: AUTO fuzziness for typo tolerance
- **Pagination**: Default 20 results per page
- **Debouncing**: 300ms delay for search input

### Scaling
For production deployments:
1. Use Elasticsearch cluster with multiple nodes
2. Increase shards for large datasets (> 50GB per index)
3. Add more replicas for read-heavy workloads
4. Consider index aliases for zero-downtime reindexing
5. Use bulk operations for batch updates

## Index Mappings

### Tickets Index
```json
{
  "subject": { "type": "text", "analyzer": "autocomplete" },
  "description": { "type": "text" },
  "status": { "type": "keyword" },
  "priority": { "type": "keyword" },
  "category": { "type": "keyword" },
  "tags": { "type": "keyword" },
  "slaBreach": { "type": "boolean" },
  "createdAt": { "type": "date" }
}
```

### Custom Analyzers
- **autocomplete**: Edge n-gram tokenizer for prefix matching
- **autocomplete_search**: Standard tokenizer for search queries

## Troubleshooting

### Connection Errors
```
Error: connect ECONNREFUSED 127.0.0.1:9200
```
**Solution**: Ensure Elasticsearch is running on the configured port.

### Authentication Errors
```
Error: security_exception
```
**Solution**: Verify your ELASTICSEARCH_API_KEY or username/password.

### Index Not Found
```
Error: index_not_found_exception
```
**Solution**: Restart the application to trigger index initialization.

### Search Returns No Results
1. Check if data is indexed: `GET http://localhost:9200/tickets/_count`
2. Verify auto-indexing middleware is applied to routes
3. Check Elasticsearch logs for errors

### Performance Issues
1. Reduce result size with pagination
2. Limit highlighted fragments
3. Remove unnecessary aggregations
4. Check Elasticsearch resource usage (CPU, memory)

## Monitoring

### Check Index Stats
```bash
curl http://localhost:9200/_cat/indices?v
```

### View Index Mapping
```bash
curl http://localhost:9200/tickets/_mapping
```

### Search Index Directly
```bash
curl -X POST http://localhost:9200/tickets/_search \
  -H 'Content-Type: application/json' \
  -d '{"query": {"match_all": {}}}'
```

## Best Practices

1. **Always use the API endpoints** - Don't bypass the service layer
2. **Implement proper error handling** - Elasticsearch failures shouldn't break your app
3. **Use debouncing** for search-as-you-type
4. **Limit result sets** with pagination
5. **Cache frequently used queries** (optional)
6. **Monitor index size** and performance
7. **Backup indices** before major changes
8. **Use filters for exact matching** (faster than queries)
9. **Use aggregations** for analytics instead of post-processing
10. **Test search relevance** with real user data

## Advanced Features

### Custom Scoring
Modify field boosting in `elasticsearch.service.ts`:
```typescript
fields: ['subject^5', 'description^2', 'tags'],
```

### Synonyms
Add synonym analyzer for better matching:
```json
{
  "filter": {
    "synonym": {
      "type": "synonym",
      "synonyms": ["bug,defect", "feature,enhancement"]
    }
  }
}
```

### Multi-language Support
Configure language-specific analyzers:
```json
{
  "description_en": { "type": "text", "analyzer": "english" },
  "description_es": { "type": "text", "analyzer": "spanish" }
}
```

## Security

### Production Checklist
- [ ] Enable Elasticsearch security (xpack.security.enabled=true)
- [ ] Use API keys instead of username/password
- [ ] Rotate API keys regularly
- [ ] Enable TLS/SSL for Elasticsearch connections
- [ ] Restrict network access to Elasticsearch
- [ ] Implement role-based access control (RBAC)
- [ ] Audit search queries for sensitive data
- [ ] Sanitize user input before indexing

## Support

For issues or questions:
1. Check Elasticsearch logs: `/var/log/elasticsearch/`
2. Check application logs for Elasticsearch errors
3. Review the Elasticsearch documentation: https://www.elastic.co/guide/
4. Contact your DevOps team for infrastructure issues
