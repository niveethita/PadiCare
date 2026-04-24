const { SearchServiceClient } = require('@google-cloud/discoveryengine').v1beta;

const client = new SearchServiceClient();

async function searchKnowledge(query) {
  const projectId = process.env.VERTEX_PROJECT_ID;
  const datastoreId = process.env.VERTEX_DATASTORE_ID;  // ← Fixed: was VERTEX_ENGINE_ID

  if (!projectId || !datastoreId) {
    console.warn('RAG: Missing VERTEX_PROJECT_ID or VERTEX_DATASTORE_ID in .env');
    return [];
  }

  // Correct serving config path for a datastore (not engine)
  const servingConfig =
    `projects/${projectId}/locations/global/collections/default_collection` +
    `/dataStores/${datastoreId}/servingConfigs/default_config`;

  const request = {
    servingConfig,
    query,
    pageSize: 3,
    queryExpansionSpec: { condition: 'AUTO' },
    spellCorrectionSpec: { mode: 'AUTO' },
  };

  try {
    const [response] = await client.search(request, { autoPaginate: false });
    const results = Array.from(response);

    console.log('RAG results count:', results.length);
    if (!results || results.length === 0) {
      console.log('RAG: No documents found for query:', query);
      return [];
    }

    const chunks = results
      .map((result, i) => {
        const doc = result.document;
        const structData = doc?.derivedStructData?.fields;

        let text = null;

        // Try extractive_answers first
        if (structData?.extractive_answers?.listValue?.values?.[0]) {
          const answer = structData.extractive_answers.listValue.values[0].structValue?.fields;
          text = answer?.content?.stringValue || answer?.snippet?.stringValue;
        }

        // Fallback to snippets or raw content
        if (!text) {
          text =
            structData?.snippets?.listValue?.values?.[0]?.structValue?.fields?.snippet?.stringValue ||
            doc?.content?.stringValue ||
            structData?.title?.stringValue;
        }

        if (!text) {
          console.log(`RAG result ${i}: no extractable text`);
        }

        return text || '';
      })
      .filter(text => text.length > 0);

    console.log(`RAG: Returning ${chunks.length} chunks`);
    return chunks;

  } catch (error) {
    console.error('RAG search error:', error.message);
    return [];  // Graceful fallback — Gemini still answers from training
  }
}

module.exports = { searchKnowledge };
