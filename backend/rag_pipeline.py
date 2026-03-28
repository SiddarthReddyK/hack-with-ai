"""
rag_pipeline.py
----------------
Modular RAG (Retrieval-Augmented Generation) pipeline for medical lab report context retrieval.

Responsibilities:
  - Load a plain-text medical knowledge base
  - Chunk it into overlapping segments
  - Embed each chunk using OpenAI embeddings
  - Store embeddings in a local FAISS vector store
  - Expose a retrieval function to fetch top-k relevant chunks for given lab parameters

Usage:
    from rag_pipeline import RAGPipeline

    rag = RAGPipeline(knowledge_file="medical_knowledge.txt")
    context = rag.retrieve(query="high LDL cholesterol")
"""

import os
from typing import List

from langchain_core.embeddings import Embeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS


# ---------------------------------------------------------------------------
# Fallback: lightweight mock embeddings (used when no OpenAI key is present)
# ---------------------------------------------------------------------------
class _MockEmbeddings(Embeddings):
    """
    Deterministic character-frequency embeddings for offline/testing.
    Subclasses langchain_core.embeddings.Embeddings so FAISS accepts it.
    """

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        return [self._embed(t) for t in texts]

    def embed_query(self, text: str) -> List[float]:
        return self._embed(text)

    @staticmethod
    def _embed(text: str) -> List[float]:
        """128-dim vector: normalised character frequency counts."""
        vec = [0.0] * 128
        text_lower = text.lower()
        for ch in text_lower:
            idx = ord(ch) % 128
            vec[idx] += 1.0
        total = sum(vec) or 1.0
        return [v / total for v in vec]


# ---------------------------------------------------------------------------
# RAGPipeline
# ---------------------------------------------------------------------------
class RAGPipeline:
    """
    Encapsulates the full RAG pipeline:
      1. Load knowledge base text
      2. Split into chunks
      3. Embed and store in FAISS
      4. Retrieve relevant context for a query

    Parameters
    ----------
    knowledge_file : str
        Path to the plain-text medical knowledge file.
    chunk_size : int
        Max characters per text chunk (default 600).
    chunk_overlap : int
        Overlap between adjacent chunks (default 80).
    top_k : int
        Number of chunks to retrieve per query (default 4).
    use_mock_embeddings : bool
        If True, bypass OpenAI and use offline mock embeddings.
        Auto-detected from OPENAI_API_KEY environment variable.
    """

    def __init__(
        self,
        knowledge_file: str = "medical_knowledge.txt",
        chunk_size: int = 600,
        chunk_overlap: int = 80,
        top_k: int = 4,
        use_mock_embeddings: bool | None = None,
    ) -> None:
        self.top_k = top_k
        self._knowledge_file = knowledge_file

        # Auto-detect embedding mode
        if use_mock_embeddings is None:
            use_mock_embeddings = not bool(os.getenv("OPENAI_API_KEY"))

        if use_mock_embeddings:
            self._embeddings = _MockEmbeddings()
        else:
            # Lazy import — only required when OPENAI_API_KEY is present
            from langchain_openai import OpenAIEmbeddings  # noqa: PLC0415
            self._embeddings = OpenAIEmbeddings(model="text-embedding-3-small")

        self._vector_store: FAISS = self._build_index(chunk_size, chunk_overlap)
        print(
            f"[RAGPipeline] Index built — "
            f"{'mock' if use_mock_embeddings else 'OpenAI'} embeddings, "
            f"file='{knowledge_file}', top_k={top_k}"
        )

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------
    def _load_text(self) -> str:
        with open(self._knowledge_file, "r", encoding="utf-8") as fh:
            return fh.read()

    def _build_index(self, chunk_size: int, chunk_overlap: int) -> FAISS:
        """Chunk the knowledge base and store embeddings in FAISS."""
        raw_text = self._load_text()

        splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            separators=["\n\n", "\n", ".", " "],
        )
        chunks = splitter.create_documents([raw_text])

        # FAISS.from_documents requires an embeddings object with embed_documents()
        vector_store = FAISS.from_documents(chunks, self._embeddings)
        return vector_store

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------
    def retrieve(self, query: str) -> str:
        """
        Retrieve the most relevant text chunks for *query*.

        Parameters
        ----------
        query : str
            Typically a sentence describing an abnormal lab parameter,
            e.g. "high LDL cholesterol" or "low hemoglobin".

        Returns
        -------
        str
            Concatenated relevant text chunks, separated by newlines.
        """
        docs = self._vector_store.similarity_search(query, k=self.top_k)
        return "\n\n".join(doc.page_content for doc in docs)

    def retrieve_for_abnormal_params(self, parameters: list) -> str:
        """
        Aggregate retrieval across all abnormal parameters in a report.

        Parameters
        ----------
        parameters : list[dict]
            List of parameter dicts from the lab report JSON schema.
            Each dict must have at least "name" and "status" keys.

        Returns
        -------
        str
            Deduplicated, concatenated relevant medical context.
        """
        abnormal = [p for p in parameters if p.get("status") in ("High", "Low")]

        if not abnormal:
            return "All parameters are within normal range."

        seen: set[str] = set()
        combined_chunks: list[str] = []

        for param in abnormal:
            query = f"{param['status']} {param['name']}"
            docs = self._vector_store.similarity_search(query, k=2)
            for doc in docs:
                content = doc.page_content.strip()
                if content not in seen:
                    seen.add(content)
                    combined_chunks.append(content)

        return "\n\n".join(combined_chunks)
