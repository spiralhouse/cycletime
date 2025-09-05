package io.spiralhouse.cycletime.mcp.resources.indexing

import io.spiralhouse.cycletime.mcp.resources.Resource
import java.util.concurrent.ConcurrentHashMap

/**
 * Index for fast resource lookups and searches
 * 
 * This class provides various indexing strategies to enable
 * efficient resource discovery based on different criteria.
 */
class ResourceIndex {
    // Primary index by URI
    private val uriIndex = ConcurrentHashMap<String, Resource>()
    
    // Secondary indexes
    private val schemeIndex = ConcurrentHashMap<String, MutableSet<String>>()
    private val mimeTypeIndex = ConcurrentHashMap<String, MutableSet<String>>()
    private val nameIndex = ConcurrentHashMap<String, MutableSet<String>>()
    
    // Full-text search index (simple implementation)
    private val textIndex = ConcurrentHashMap<String, MutableSet<String>>()
    
    /**
     * Add a resource to the index
     */
    fun add(resource: Resource) {
        // Primary index
        uriIndex[resource.uri] = resource
        
        // Scheme index
        schemeIndex.computeIfAbsent(resource.scheme) { 
            ConcurrentHashMap.newKeySet() 
        }.add(resource.uri)
        
        // MIME type index
        mimeTypeIndex.computeIfAbsent(resource.mimeType) { 
            ConcurrentHashMap.newKeySet() 
        }.add(resource.uri)
        
        // Name index (for partial matches)
        val nameLower = resource.name.lowercase()
        nameIndex.computeIfAbsent(nameLower) { 
            ConcurrentHashMap.newKeySet() 
        }.add(resource.uri)
        
        // Text index (tokenize name and description)
        indexText(resource)
    }
    
    /**
     * Remove a resource from the index
     */
    fun remove(uri: String) {
        val resource = uriIndex.remove(uri) ?: return
        
        // Remove from secondary indexes
        schemeIndex[resource.scheme]?.remove(uri)
        mimeTypeIndex[resource.mimeType]?.remove(uri)
        nameIndex[resource.name.lowercase()]?.remove(uri)
        
        // Remove from text index
        removeFromTextIndex(resource)
    }
    
    /**
     * Update a resource in the index
     */
    fun update(resource: Resource) {
        remove(resource.uri)
        add(resource)
    }
    
    /**
     * Find resource by URI
     */
    fun findByUri(uri: String): Resource? {
        return uriIndex[uri]
    }
    
    /**
     * Find resources by scheme
     */
    fun findByScheme(scheme: String): List<Resource> {
        val uris = schemeIndex[scheme] ?: emptySet()
        return uris.mapNotNull { uriIndex[it] }
    }
    
    /**
     * Find resources by MIME type
     */
    fun findByMimeType(mimeType: String): List<Resource> {
        val uris = mimeTypeIndex[mimeType] ?: emptySet()
        return uris.mapNotNull { uriIndex[it] }
    }
    
    /**
     * Search resources by text query
     */
    fun search(query: String): List<Resource> {
        val queryLower = query.lowercase()
        val results = mutableSetOf<String>()
        
        // Search in name index
        nameIndex.entries
            .filter { it.key.contains(queryLower) }
            .forEach { results.addAll(it.value) }
        
        // Search in text index
        val tokens = tokenize(queryLower)
        tokens.forEach { token ->
            textIndex[token]?.let { results.addAll(it) }
        }
        
        return results.mapNotNull { uriIndex[it] }
    }
    
    /**
     * Get index statistics
     */
    fun getStats(): IndexStats {
        return IndexStats(
            totalResources = uriIndex.size,
            schemes = schemeIndex.keys.toSet(),
            mimeTypes = mimeTypeIndex.keys.toSet(),
            indexedTerms = textIndex.size
        )
    }
    
    /**
     * Clear all indexes
     */
    fun clear() {
        uriIndex.clear()
        schemeIndex.clear()
        mimeTypeIndex.clear()
        nameIndex.clear()
        textIndex.clear()
    }
    
    private fun indexText(resource: Resource) {
        val text = buildString {
            append(resource.name)
            resource.description?.let { append(" ").append(it) }
        }.lowercase()
        
        val tokens = tokenize(text)
        tokens.forEach { token ->
            textIndex.computeIfAbsent(token) { 
                ConcurrentHashMap.newKeySet() 
            }.add(resource.uri)
        }
    }
    
    private fun removeFromTextIndex(resource: Resource) {
        val text = buildString {
            append(resource.name)
            resource.description?.let { append(" ").append(it) }
        }.lowercase()
        
        val tokens = tokenize(text)
        tokens.forEach { token ->
            textIndex[token]?.remove(resource.uri)
        }
    }
    
    private fun tokenize(text: String): Set<String> {
        return text.split(Regex("\\s+"))
            .filter { it.length > 2 }  // Skip very short tokens
            .map { it.trim() }
            .filter { it.isNotEmpty() }
            .toSet()
    }
    
    /**
     * Index statistics
     */
    data class IndexStats(
        val totalResources: Int,
        val schemes: Set<String>,
        val mimeTypes: Set<String>,
        val indexedTerms: Int
    )
}