Search Pipeline
===============

Search Index Configuration
--------------------------

.. code-block:: yaml

   type: list
   items:
     type: dict
     schema:
       glob: {type: str, required: true}
       docs_parser: {type: str}

Search Index Data Structure
---------------------------

.. include:: ./09-search-pipeline.yaml
   :code: yaml


Pipeline DAG
------------


.. digraph:: pipeline

    edge [color="#808080", arrowsize=.6, penwidth=3, minlen=3];
    node [shape=box, fontname="DIN Next, sans-serif", style="rounded,filled", penwidth=5, fillcolor="#8010d0", color="#f0f0f0", fontcolor=white,  margin="0.35" fontweight=bold]
    bgcolor="#f0f0f0";
    path -> content [label=" Save version"]
    content -> doc [label=" Split file into docs"]
    doc -> chunk [label=" Split"]
    doc -> fact [label=" Extract knowledge"]
    doc -> tfidf [label=" Build TF-IDF"]
    chunk [label=" chunk (e)"]
    fact [label=" fact (e)"]
    chunk -> embedding
    fact -> embedding

    embedding [label="Embeddings (fact or chunk)"]
    tfidf [label=" Term inverse index"]
    embedding -> kNN [label=" Collect"]
    serve -> kNN [label=" Find top-K embeddings"]
    kNN -> RAG [label=" Summarize"]
    serve -> tfidf [label=" Find top-N docs"]
    tfidf -> RAG  [label=" Summarize"]
    serve -> LLM [label=" Answer from internal memory"]
    LLM -> RAG  [label=" Summarize"]

Knowledge Extraction
--------------------

Prompt:

    Format the following document as a list of self-sufficient evergreen facts. One per line. Include supporting context in each fact.

    {text}

Postprocessing::

    [line.strip(' \n-') for line in output.splitlines()]

Retrieval-Augmented Generation
------------------------------

Prompt:

    Answer the following question using only the context below. Only include information specifically discussed. Copy the answer verbatim from the context. Exclude irrelevant sentences. Be concise.
    
    Question: {question}
    Context: {context} 
