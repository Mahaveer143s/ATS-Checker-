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

    // Extract candidate email
    const emailMatch = resumeText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    const candidateEmail = emailMatch ? emailMatch[0] : 'Not Found';

    // Check for skills section
    const skillsSection = resumeText.match(/skills?\s*[:\-\n]*([\s\S]*?)(?=(\n\s*\n|experience|skills|education|projects|certifications))/i);
    let skills = '';
    if (skillsSection) {
        skills = skillsSection[1].trim();
        feedback.push('<p class="success">Skills section found. Extracted skills:</p>');
        feedback.push(`<p>${skills}</p>`);
    } else {
        feedback.push('<p class="error">No "Skills" section found.</p>');
        score -= 20;
    }

    // Check for experience section
    if (!resumeText.toLowerCase().includes('experience')) {
        feedback.push('<p class="error">No "Experience" section found.</p>');
        score -= 20;
    } else {
        feedback.push('<p class="success">Experience section found.</p>');
    }

    // Check for education section
    if (!resumeText.toLowerCase().includes('education')) {
        feedback.push('<p class="error">No "Education" section found.</p>');
        score -= 15;
    } else {
        feedback.push('<p class="success">Education section found.</p>');
    }

    // Check if resume is too short
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
        downloadSummaryAsWord(feedback, score, candidateName, candidateEmail, skills);
    });
}

function updateCircle(percentage) {
    const circle = document.querySelector('.circle');
    const insideCircle = document.querySelector('.inside-circle');

    const angle = (percentage / 100) * 360;
    circle.style.background = `conic-gradient(#2675e2 ${angle}deg, #e6e2e7 ${angle}deg)`;
    insideCircle.textContent = `${percentage}%`;
}

function downloadSummaryAsWord(feedback, score, candidateName, candidateEmail, skills) {
    let content = `Resume Analysis Summary for ${candidateName}\n\n`;

    content += `Candidate Name: ${candidateName}\n`;
    content += `Candidate Email: ${candidateEmail}\n`;
    content += `\nExtracted Skills:\n${skills}\n\n`;

    feedback.forEach(item => {
        content += item.replace(/<\/?[^>]+(>|$)/g, "") + "\n";
    });

    content += `\nFinal Score: ${score}%`;

    const blob = new Blob([content], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${candidateName}_Resume_Analysis.doc`;
    a.click();
}
