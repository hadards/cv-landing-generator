// Landing Page Script - Renders CV data into the template
document.addEventListener('DOMContentLoaded', function() {
    console.log('Landing page loading...', cvData);
    
    // Helper function to get initials
    function getInitials(name) {
        return name.split(' ').map(n => n[0]).join('').toUpperCase();
    }

    // Helper function to format date
    function formatDate(dateStr) {
        if (!dateStr) return '';
        if (dateStr.toLowerCase() === 'present') return 'Present';
        
        // Try to parse and format the date
        const date = new Date(dateStr + '-01'); // Add day for parsing
        if (isNaN(date.getTime())) return dateStr;
        
        return date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short' 
        });
    }

    // Update page title
    document.title = `${cvData.personalInfo.name} - Professional Profile`;

    // Update header
    const headerName = document.getElementById('header-name');
    const headerTitle = document.getElementById('header-title');
    const emailLink = document.getElementById('email-link');

    if (headerName) headerName.textContent = cvData.personalInfo.name;
    if (emailLink) emailLink.href = `mailto:${cvData.personalInfo.email}`;
    
    // Set current title from first experience
    const currentTitle = cvData.experience.length > 0 ? cvData.experience[0].title : 'Professional';
    if (headerTitle) headerTitle.textContent = currentTitle;

    // Update hero section - THIS WAS THE MISSING PART!
    const heroName = document.getElementById('hero-name');
    const heroTitle = document.getElementById('hero-title');
    const heroLocation = document.getElementById('hero-location');
    const heroSummary = document.getElementById('hero-summary');
    const heroAvatar = document.getElementById('hero-avatar');

    if (heroName) heroName.textContent = cvData.personalInfo.name;
    if (heroTitle) heroTitle.textContent = currentTitle;
    
    // FIX: Properly update the summary
    if (heroSummary) {
        heroSummary.textContent = cvData.personalInfo.summary || 'Professional dedicated to excellence and innovation.';
    }
    
    if (heroLocation) {
        const locationSpan = heroLocation.querySelector('span');
        if (locationSpan) locationSpan.textContent = cvData.personalInfo.location;
    }

    // Handle hero avatar properly
    if (heroAvatar && cvData.personalInfo.profilePicture) {
        // Replace entire content with image
        heroAvatar.innerHTML = `<img src="${cvData.personalInfo.profilePicture}" alt="${cvData.personalInfo.name}" class="w-full h-full object-cover rounded-full">`;
        heroAvatar.className = "hero-avatar w-48 h-48 rounded-full overflow-hidden";
    } else if (heroAvatar) {
        // Keep initials styling
        heroAvatar.className = "hero-avatar w-48 h-48 rounded-full bg-white/10 flex items-center justify-center text-6xl font-bold text-white backdrop-blur-sm";
        const initials = getInitials(cvData.personalInfo.name);
        heroAvatar.innerHTML = `<span>${initials}</span>`;
    }

    // Update quick contact
    const quickEmail = document.getElementById('quick-email');
    const quickPhone = document.getElementById('quick-phone');

    if (quickEmail) {
        quickEmail.href = `mailto:${cvData.personalInfo.email}`;
        const emailSpan = quickEmail.querySelector('span');
        if (emailSpan) emailSpan.textContent = cvData.personalInfo.email;
    }
    
    if (quickPhone) {
        quickPhone.href = `tel:${cvData.personalInfo.phone}`;
        const phoneSpan = quickPhone.querySelector('span');
        if (phoneSpan) phoneSpan.textContent = cvData.personalInfo.phone;
    }

    // Render Experience with better date alignment
    const experienceContainer = document.getElementById('experience-container');
    if (experienceContainer && cvData.experience.length > 0) {
        experienceContainer.innerHTML = cvData.experience.map(exp => `
            <div class="experience-card">
                <div class="flex flex-col lg:flex-row lg:justify-between lg:items-start mb-4">
                    <div class="flex-1">
                        <h3 class="text-xl font-semibold text-gray-900 mb-1">${exp.title}</h3>
                        <p class="text-lg text-blue-600 font-medium mb-1">${exp.company}</p>
                        <p class="text-gray-600">${exp.location}</p>
                    </div>
                    <div class="text-gray-500 text-right mt-2 lg:mt-0 lg:ml-4 flex-shrink-0">
                        <p class="font-medium text-sm lg:text-base whitespace-nowrap">${formatDate(exp.startDate)} - ${formatDate(exp.endDate)}</p>
                    </div>
                </div>
                <p class="text-gray-700 mb-4 leading-relaxed">${exp.description}</p>
                ${exp.achievements && exp.achievements.length > 0 ? `
                    <div>
                        <h4 class="font-medium text-gray-900 mb-2">Key Achievements:</h4>
                        <ul class="list-disc list-inside text-gray-700 space-y-1">
                            ${exp.achievements.map(achievement => `<li>${achievement}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
            </div>
        `).join('');
    } else {
        const experienceSection = document.getElementById('experience-section');
        if (experienceSection) experienceSection.style.display = 'none';
    }

    // Render Skills
    const technicalSkills = document.getElementById('technical-skills');
    const softSkills = document.getElementById('soft-skills');
    const languages = document.getElementById('languages');

    if (technicalSkills && cvData.skills.technical.length > 0) {
        technicalSkills.innerHTML = cvData.skills.technical.map(skill =>
            `<span class="skill-tag">${skill}</span>`
        ).join('');
    }

    if (softSkills && cvData.skills.soft.length > 0) {
        softSkills.innerHTML = cvData.skills.soft.map(skill =>
            `<span class="skill-tag">${skill}</span>`
        ).join('');
    }

    if (languages && cvData.skills.languages.length > 0) {
        languages.innerHTML = cvData.skills.languages.map(lang =>
            `<span class="skill-tag">${lang}</span>`
        ).join('');
    } else {
        const languagesSection = document.getElementById('languages-section');
        if (languagesSection) languagesSection.style.display = 'none';
    }

    // Hide skills section if no skills
    if (cvData.skills.technical.length === 0 && cvData.skills.soft.length === 0) {
        const skillsSection = document.getElementById('skills-section');
        if (skillsSection) skillsSection.style.display = 'none';
    }

    // Render Education
    const educationContainer = document.getElementById('education-container');
    if (educationContainer && cvData.education.length > 0) {
        educationContainer.innerHTML = cvData.education.map(edu => `
        <div class="education-card">
            <div class="flex flex-col lg:flex-row lg:justify-between lg:items-start mb-4">
                <div class="flex-1">
                    <h3 class="text-xl font-semibold text-gray-900 mb-1">${edu.degree}</h3>
                    <p class="text-lg text-blue-600 font-medium mb-1">${edu.institution}</p>
                    <p class="text-gray-600">${edu.location}</p>
                    ${edu.gpa ? `<p class="text-gray-600">GPA: ${edu.gpa}</p>` : ''}
                </div>
                <div class="text-gray-500 text-right mt-2 lg:mt-0 lg:ml-4 flex-shrink-0">
                    <p class="font-medium text-sm lg:text-base whitespace-nowrap">${edu.graduationDate}</p>
                </div>
            </div>
            ${edu.achievements && edu.achievements.length > 0 ? `
                <div>
                    <h4 class="font-medium text-gray-900 mb-2">Achievements:</h4>
                    <ul class="list-disc list-inside text-gray-700 space-y-1">
                        ${edu.achievements.map(achievement => `<li>${achievement}</li>`).join('')}
                    </ul>
                </div>
            ` : ''}
        </div>
    `).join('');
    } else {
        const educationSection = document.getElementById('education-section');
        if (educationSection) educationSection.style.display = 'none';
    }

    // Render Projects
    const projectsContainer = document.getElementById('projects-container');
    if (projectsContainer && cvData.projects.length > 0) {
        projectsContainer.innerHTML = cvData.projects.map(project => `
            <div class="project-card">
                <h3 class="text-xl font-semibold text-gray-900 mb-3">${project.name}</h3>
                <p class="text-gray-700 mb-4">${project.description}</p>
                ${project.technologies && project.technologies.length > 0 ? `
                    <div class="mb-4">
                        <h4 class="text-sm font-medium text-gray-900 mb-2">Technologies:</h4>
                        <div class="flex flex-wrap gap-2">
                            ${project.technologies.map(tech => `<span class="skill-tag text-xs">${tech}</span>`).join('')}
                        </div>
                    </div>
                ` : ''}
                ${project.url ? `
                    <a href="${project.url}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-700 font-medium text-sm">
                        View Project →
                    </a>
                ` : ''}
            </div>
        `).join('');
    } else {
        const projectsSection = document.getElementById('projects-section');
        if (projectsSection) projectsSection.style.display = 'none';
    }

    // Render Certifications
    const certificationsContainer = document.getElementById('certifications-container');
    if (certificationsContainer && cvData.certifications.length > 0) {
        certificationsContainer.innerHTML = cvData.certifications.map(cert => `
            <div class="certification-card">
                <h3 class="text-lg font-semibold text-gray-900 mb-2">${cert.name}</h3>
                <p class="text-blue-600 font-medium mb-2">${cert.issuer}</p>
                <p class="text-gray-600 text-sm mb-3">${cert.date}</p>
                ${cert.url ? `
                    <a href="${cert.url}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-700 font-medium text-sm">
                        View Certificate
                    </a>
                ` : ''}
            </div>
        `).join('');
    } else {
        const certificationsSection = document.getElementById('certifications-section');
        if (certificationsSection) certificationsSection.style.display = 'none';
    }

    // Update contact buttons
    const contactEmailBtn = document.getElementById('contact-email-btn');
    const contactPhoneBtn = document.getElementById('contact-phone-btn');
    const footerName = document.getElementById('footer-name');

    if (contactEmailBtn) contactEmailBtn.href = `mailto:${cvData.personalInfo.email}`;
    if (contactPhoneBtn) contactPhoneBtn.href = `tel:${cvData.personalInfo.phone}`;
    if (footerName) footerName.textContent = cvData.personalInfo.name;

    // Add contact button functionality
    const contactBtn = document.getElementById('contact-btn');
    if (contactBtn) {
        contactBtn.addEventListener('click', function () {
            window.location.href = `mailto:${cvData.personalInfo.email}`;
        });
    }

    console.log('Landing page loaded successfully!');
});