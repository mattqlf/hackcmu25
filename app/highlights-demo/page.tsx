import { SidenoteManager } from '@/components/highlights/SidenoteManager';

export default function HighlightsDemoPage() {
  const pageUrl = '/highlights-demo';

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-bold mb-2">Highlights Demo</h1>
          <p className="text-muted-foreground">
            Select any text below to add a sidenote. This uses the integrated sidenotes library positioning.
          </p>
        </header>

        <SidenoteManager pageUrl={pageUrl} docId="highlights-article">
          <div className="prose prose-lg dark:prose-invert mx-auto">
              <h2>The Future of Collaborative Text Editing</h2>

              <p>
                In the rapidly evolving landscape of digital collaboration, the ability to annotate and
                comment on shared documents has become increasingly important. Traditional document
                editing tools have long provided basic commenting functionality, but modern web
                applications demand more sophisticated approaches to real-time collaboration.
              </p>

              <p>
                The integration of text highlighting with persistent sidenotes represents a significant
                advancement in how we interact with digital content. Unlike simple comments that are
                often disconnected from their context, highlighted annotations maintain a direct visual
                and semantic connection to the specific text they reference.
              </p>

              <h3>Key Benefits of Text Highlighting</h3>

              <ul>
                <li>
                  <strong>Visual Context:</strong> Highlights provide immediate visual feedback about which
                  parts of a document have been annotated, making it easier for readers to identify
                  areas of interest or concern.
                </li>
                <li>
                  <strong>Persistent References:</strong> Unlike traditional comments that may become
                  detached from their original context when text is edited, properly implemented
                  highlighting systems maintain their connections through XPath-based positioning.
                </li>
                <li>
                  <strong>Collaborative Workflows:</strong> Multiple users can add their own highlights
                  and annotations, creating a rich tapestry of collaborative input that enhances the
                  overall document.
                </li>
              </ul>

              <p>
                The technical implementation of such systems requires careful consideration of several
                factors. First, the selection and serialization of text ranges must be robust enough
                to handle complex document structures including nested elements, mixed content, and
                dynamically generated content.
              </p>

              <blockquote>
                &ldquo;The best collaborative tools are those that feel natural and intuitive, seamlessly
                integrating into existing workflows without requiring users to learn new paradigms.&rdquo;
                - Anonymous UX Designer
              </blockquote>

              <p>
                Second, the persistence layer must be designed to handle real-time synchronization
                across multiple users while maintaining data integrity. This often involves sophisticated
                conflict resolution algorithms and optimistic updating strategies.
              </p>

              <h3>Technical Considerations</h3>

              <p>
                When implementing text highlighting functionality, developers must balance several
                competing concerns. Performance is critical, as highlighting operations should not
                impact the responsiveness of the user interface. This requires efficient algorithms
                for range detection, DOM manipulation, and event handling.
              </p>

              <p>
                Accessibility is another crucial factor that is often overlooked. Highlighted text
                must remain readable for users with visual impairments, and the interface for creating
                and managing annotations should be fully keyboard navigable. Screen readers should be
                able to properly interpret highlighted content and associated annotations.
              </p>

              <p>
                Cross-browser compatibility presents ongoing challenges, particularly when dealing with
                the Selection and Range APIs which have subtle differences across different JavaScript
                engines. Thorough testing across multiple browsers and devices is essential for ensuring
                a consistent user experience.
              </p>

              <h3>Future Directions</h3>

              <p>
                Looking ahead, we can expect to see continued innovation in collaborative text editing
                tools. Machine learning algorithms may soon be able to suggest relevant annotations
                based on document content and user behavior patterns. Integration with voice recognition
                systems could enable hands-free annotation workflows.
              </p>

              <p>
                The emergence of WebAssembly also opens new possibilities for bringing desktop-class
                text processing capabilities to web applications, potentially enabling more sophisticated
                text analysis and manipulation features that were previously only possible in native
                applications.
              </p>
          </div>
        </SidenoteManager>
      </div>
    </div>
  );
}