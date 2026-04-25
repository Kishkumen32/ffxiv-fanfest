
document.addEventListener('DOMContentLoaded', () => {
  const transcriptContainer = document.getElementById('transcript-container');
  const searchInput = document.getElementById('search-input');
  const transcriptTitle = document.getElementById('transcript-title');

  let transcriptData = [];

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const renderTranscript = (data) => {
    transcriptContainer.innerHTML = '';
    data.forEach(segment => {
      const segmentElement = document.createElement('div');
      segmentElement.classList.add('transcript-segment');
      segmentElement.dataset.start = segment.start;

      const timestampElement = document.createElement('a');
      timestampElement.classList.add('transcript-timestamp');
      timestampElement.textContent = formatTime(segment.start);
      timestampElement.href = `#segment-${segment.start}`;

      const textElement = document.createElement('p');
      textElement.classList.add('transcript-text');
      textElement.textContent = segment.text;

      segmentElement.appendChild(timestampElement);
      segmentElement.appendChild(textElement);
      transcriptContainer.appendChild(segmentElement);

      timestampElement.addEventListener('click', (e) => {
        e.preventDefault();
        segmentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    });
  };

  const filterTranscript = (query) => {
    const lowerCaseQuery = query.toLowerCase();
    const filteredData = transcriptData.filter(segment =>
      segment.text.toLowerCase().includes(lowerCaseQuery)
    );
    renderTranscript(filteredData);
  };

  const loadTranscript = async () => {
    const transcriptFile = transcriptContainer.dataset.transcript;
    try {
      const response = await fetch(transcriptFile);
      transcriptData = await response.json();
      renderTranscript(transcriptData);
    } catch (error) {
      console.error('Error loading transcript:', error);
      transcriptContainer.innerHTML = '<p class="error">Failed to load transcript.</p>';
    }
  };

  searchInput.addEventListener('input', () => {
    filterTranscript(searchInput.value);
  });

  loadTranscript();
});
