document.getElementById('analyzeBtn').addEventListener('click', function () {
    const fileInput = document.getElementById('fileInput').files[0];

    if (!fileInput) {
        alert("Please upload a resume!");
        return;
    }

    document.getElementById('resumeName').textContent = fileInput.name;

    const fileReader = new FileReader();

    fileReader.onload = function () {
        const typedArray = new Uint8Array(this.result);
        pdfjsLib.getDocument(typedArray).promise.then(function (pdf) {
            let pagesPromises = [];

            for (let i = 1; i <= pdf.numPages; i++) {
                pagesPromises.push(pdf.getPage(i).then(page => {
                    return page.getTextContent().then(textContent => {
                        return textContent.items.map(item => item.str).join(' ');
                    });
                }));
            }

            Promise.all(pagesPromises).then(textArray => {
                const resumeText = textArray.join(' ');
                analyzeResume(resumeText);
            });
        });
    };

    fileReader.readAsArrayBuffer(fileInput);
});

function analyzeResume(resumeText) {
    const correctionsDiv = document.getElementById('corrections');
    correctionsDiv.innerHTML = '';
    
    let score = 100;
    const feedback = [];

    // Extract candidate name
    const nameMatch = resumeText.match(/([A-Z][a-z]+(?:\s[A-Z][a-z]+)+)/);
    const candidateName = nameMatch ? nameMatch[0] : 'Unknown';
    document.getElementById('candidateName').textContent = candidateName;

    const suggestedName = candidateName !== 'Unknown' ? `${candidateName}_Resume.pdf` : 'Unnamed_Resume.pdf';
    document.getElementById('suggestedName').textContent = suggestedName;

    // Check essential sections
    if (!resumeText.toLowerCase().includes('skills')) {
        feedback.push('<p class="error">No "Skills" section found.</p>');
        score -= 20;
    }

    if (!resumeText.toLowerCase().includes('experience')) {
        feedback.push('<p class="error">No "Experience" section found.</p>');
        score -= 20;
    }

    if (!resumeText.toLowerCase().includes('education')) {
        feedback.push('<p class="error">No "Education" section found.</p>');
        score -= 15;
    }

    if (resumeText.length < 500) {
        feedback.push('<p class="error">Your resume is too short. Add more details.</p>');
        score -= 15;
    }

    correctionsDiv.innerHTML = feedback.join('');
    updateCircle(score);

    // Show download button
    document.getElementById('resultCard').style.display = 'block';
    document.getElementById('downloadBtn').style.display = 'inline-block';
    document.getElementById('downloadBtn').addEventListener('click', function () {
        downloadSummary(feedback, score, candidateName);
    });
}

function updateCircle(percentage) {
    const circle = document.querySelector('.circle');
    const insideCircle = document.querySelector('.inside-circle');

    const angle = (percentage / 100) * 360;
    circle.style.background = `conic-gradient(#2675e2 ${angle}deg, #e6e2e7 0deg)`;
    insideCircle.textContent = `${percentage}%`;
}

function downloadSummaryAsWord(feedback, score, name) {
    const docContent = `
        Candidate: ${name}
        Score: ${score}%
        
        Feedback:
        ${feedback.map(item => item.replace(/<\/?[^>]+(>|$)/g, "")).join('\n')}
    `;

    const zip = new PizZip();
    const doc = new window.docxtemplater(zip);
    
    doc.loadZip(zip);

    // Create the document template
    doc.setData({
        name: name,
        score: score,
        feedback: feedback.map(item => item.replace(/<\/?[^>]+(>|$)/g, ""))
    });

    try {
        doc.render();
    } catch (error) {
        console.error(error);
        return;
    }

    const out = doc.getZip().generate({ type: "blob" });
    saveAs(out, `${name}_resume_feedback.docx`);
}

document.getElementById('downloadBtn').addEventListener('click', function () {
    downloadSummaryAsWord(feedback, score, candidateName);
});