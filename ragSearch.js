const { SearchServiceClient } = require('@google-cloud/discoveryengine').v1beta;

const client = new SearchServiceClient();

async function searchKnowledge(query) {
  const projectId = process.env.VERTEX_PROJECT_ID;
  const engineId = process.env.VERTEX_ENGINE_ID;

  const request = {
    servingConfig: `projects/${projectId}/locations/global/collections/default_collection/engines/${engineId}/servingConfigs/default_config`,
    query: query,
    pageSize: 3,       // top 3 most relevant chunks
    queryExpansionSpec: { condition: 'AUTO' },
    spellCorrectionSpec: { mode: 'AUTO' },
  };

  try {
    // Pass autoPaginate as option to suppress warning
    const [response] = await client.search(request, { autoPaginate: false });

    // response is an array-like object, not {results: [...]}
    const results = Array.from(response);
    console.log('RAG results count:', results.length);

    // Handle case where no results returned
    if (!results || results.length === 0) {
      console.log('RAG: No documents found for query');
      return [];
    }

    // Debug first result structure
    console.log('First result keys:', Object.keys(results[0] || {}));
    console.log('First result document:', results[0]?.document);

    // Debug: show what's in derivedStructData.fields
    console.log('Available fields:', Object.keys(results[0]?.document?.derivedStructData?.fields || {}));

    // Extract the text from results
    const chunks = results
      .map((result, i) => {
        const doc = result.document;
        const structData = doc?.derivedStructData?.fields;

        // Try extractive_answers first (what we're seeing)
        let text = null;

        if (structData?.extractive_answers?.listValue?.values?.[0]) {
          const answer = structData.extractive_answers.listValue.values[0].structValue?.fields;
          text = answer?.content?.stringValue || answer?.snippet?.stringValue;
        }

        // Fallback to other fields
        if (!text) {
          text = structData?.snippets?.listValue?.values?.[0]?.structValue?.fields?.snippet?.stringValue
            || doc?.content?.stringValue
            || structData?.title?.stringValue;
        }

        if (!text) {
          console.log(`Result ${i}: No text found in`, JSON.stringify(structData, null, 2).slice(0, 200));
        }
        return text || '';
      })
      .filter(text => text.length > 0);

    return chunks;

  } catch (error) {
    console.error('RAG search error:', error.message);
    return [];   // gracefully return empty — Gemini still works without RAG
  }
}

module.exports = { searchKnowledge };