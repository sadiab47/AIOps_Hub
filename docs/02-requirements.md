# 02 Requirements

## Functional Requirements
- **Users**: Users must be able to sign up, sign in, update profiles, and request password resets.
- **Tenancy**: Users must belong to one or more Organizations. Organization owners must be able to invite members and manage their roles.
- **Storage**: Tenants must be able to upload documents (.pdf, .txt, .docx) up to 50MB.
- **RAG & Search**: The system must extract text from documents, compute embeddings, index them in a vector database, and support semantic query matches.
- **Agents**: Admins must be able to define custom LLM agents with system instructions, temperature, and specific tool schemas.

## Non-Functional Requirements
- **Security**: Strict logical separation of data; no cross-tenant queries. JWT tokens must be stored in secure HTTP-only cookies on the web interface.
- **Performance**: Heavy background jobs (e.g. file extraction and embedding calculation) must be offloaded to queues.
- **Scalability**: Backend API layer must be stateless to support concurrent scaling behind load balancers.
