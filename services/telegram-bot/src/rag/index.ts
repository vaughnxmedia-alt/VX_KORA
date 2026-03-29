/**
 * KORA RAG (Retrieval Augmented Generation) Module
 * 
 * CONFIDENTIALITY ARCHITECTURE:
 * 
 * This module provides a unified retrieval interface that strictly separates:
 * 
 * 1. GLOBAL NAMESPACE (Core Brain)
 *    - Public, reusable knowledge
 *    - Frameworks, playbooks, platform knowledge
 *    - Can be used for ANY tenant
 * 
 * 2. TENANT NAMESPACE (Tenant Brain)
 *    - Private, confidential data
 *    - Intake answers, research, deliverables
 *    - ONLY accessible for the current tenant
 * 
 * CRITICAL RULES:
 * - Global retrieval NEVER includes tenant data
 * - Tenant retrieval ALWAYS requires tenant_id
 * - Combined retrieval NEVER mixes data from different tenants
 */

export * from "./retriever"
export * from "./context-builder"
export * from "./namespaces"
