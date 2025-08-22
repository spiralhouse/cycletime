import io.kotest.assertions.throwables.shouldThrow
import io.spiralhouse.jcvd.application.exceptions.ProjectNotFoundException
import io.spiralhouse.jcvd.domain.valueobjects.ProjectId
import kotlinx.coroutines.runBlocking

fun main() {
    runBlocking {
        try {
            shouldThrow<ProjectNotFoundException> {
                throw ProjectNotFoundException(ProjectId.generate())
            }
            println("Test passed: Exception was thrown and caught correctly")
        } catch (e: Exception) {
            println("Test failed: ${e.javaClass.simpleName}: ${e.message}")
        }
    }
}
