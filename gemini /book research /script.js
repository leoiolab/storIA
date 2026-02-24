document.addEventListener('DOMContentLoaded', function () {
    const wrapLabel = (label, maxLength = 16) => {
        if (label.length <= maxLength) {
            return label;
        }
        const words = label.split(' ');
        const lines = [];
        let currentLine = '';
        words.forEach(word => {
            if ((currentLine + ' ' + word).trim().length > maxLength) {
                lines.push(currentLine.trim());
                currentLine = word;
            } else {
                currentLine = (currentLine + ' ' + word).trim();
            }
        });
        if (currentLine) {
            lines.push(currentLine.trim());
        }
        return lines;
    };
    const multiLineTooltipTitle = {
        title: function(tooltipItems) {
            const item = tooltipItems[0];
            let label = item.chart.data.labels[item.dataIndex];
            if (Array.isArray(label)) {
              return label.join(' ');
            } else {
              return label;
            }
        }
    };
    const colors = {
        blue500: '#147DF5',
        blue400: '#60A5FA',
        cyan500: '#00C6FF',
        blue300: '#93C5FD',
        slate400: 'rgb(148, 163, 184)',
        slate100: 'rgb(241, 245, 249)'
    };
    const chartFont = {
        family: 'Inter',
        size: 12
    };
    Chart.defaults.color = colors.slate400;
    Chart.defaults.font = chartFont;
    const publicationsByEraData = {
        labels: ['Pre-Saucer Era (1920-1946)', 'Saucer Era (1947-1969)', 'Expansion of Theories (1970-1999)', 'Disclosure Era (2000-2025)'],
        datasets: [{
            label: 'Number of Published Books',
            data: [5, 14, 86, 131],
            fill: true,
            backgroundColor: 'rgba(20, 125, 245, 0.2)',
            borderColor: colors.blue500,
            pointBackgroundColor: colors.blue500,
            pointBorderColor: '#fff',
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: colors.blue500,
            tension: 0.3
        }]
    };
    const publicationsByEraCtx = document.getElementById('publicationsByEraChart').getContext('2d');
    new Chart(publicationsByEraCtx, {
        type: 'line',
        data: publicationsByEraData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(148, 163, 184, 0.2)' },
                    ticks: { color: colors.slate400 }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: colors.slate400 }
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: multiLineTooltipTitle,
                    backgroundColor: '#1E293B',
                    titleFont: { size: 14, weight: 'bold' },
                    bodyFont: { size: 12 },
                    padding: 12,
                    cornerRadius: 4
                }
            }
        }
    });
    const genreBreakdownData = {
        labels: ['Ancient Astronauts', 'Gov. Cover-up/Disclosure', 'Alien Abduction', 'Scientific/Analytical', 'Contactee/Spiritual', 'General/Other'],
        datasets: [{
            label: 'Book Count by Genre',
            data: [42, 38, 31, 29, 27, 69],
            backgroundColor: [colors.blue500, colors.cyan500, colors.blue400, '#00A8E8', '#007EA7', colors.blue300],
            borderColor: '#0F172A',
            borderWidth: 4,
            hoverOffset: 8
        }]
    };
    const genreBreakdownCtx = document.getElementById('genreBreakdownChart').getContext('2d');
    new Chart(genreBreakdownCtx, {
        type: 'doughnut',
        data: genreBreakdownData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: colors.slate100,
                        padding: 15,
                        usePointStyle: true,
                    }
                },
                tooltip: {
                    callbacks: multiLineTooltipTitle,
                     backgroundColor: '#1E293B',
                    titleFont: { size: 14, weight: 'bold' },
                    bodyFont: { size: 12 },
                    padding: 12,
                    cornerRadius: 4
                }
            },
            cutout: '60%'
        }
    });
    const prolificAuthorsData = {
        labels: [
            wrapLabel('Erich von Däniken'),
            wrapLabel('Jacques Vallée'),
            wrapLabel('Zecharia Sitchin'),
            wrapLabel('Donald Edward Keyhoe'),
            wrapLabel('Timothy Good'),
            wrapLabel('Whitley Strieber'),
            wrapLabel('John E. Mack'),
            wrapLabel('Budd Hopkins'),
            wrapLabel('Richard M. Dolan'),
            wrapLabel('Dolores Cannon')
        ],
        datasets: [{
            label: 'Number of Significant Books',
            data: [16, 11, 10, 5, 6, 5, 4, 4, 3, 4],
            backgroundColor: [colors.blue500, colors.blue500, colors.blue500, colors.blue400, colors.blue400, colors.blue400, colors.cyan500, colors.cyan500, colors.blue300, colors.blue300],
            borderColor: 'rgba(0,0,0,0)',
            borderWidth: 1,
            borderRadius: 4
        }]
    };
    const prolificAuthorsCtx = document.getElementById('prolificAuthorsChart').getContext('2d');
    new Chart(prolificAuthorsCtx, {
        type: 'bar',
        data: prolificAuthorsData,
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    beginAtZero: true,
                    grid: { color: 'rgba(148, 163, 184, 0.2)' },
                    ticks: { color: colors.slate400 }
                },
                y: {
                   grid: { display: false },
                   ticks: { color: colors.slate100 }
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: multiLineTooltipTitle,
                    backgroundColor: '#1E293B',
                    titleFont: { size: 14, weight: 'bold' },
                    bodyFont: { size: 12 },
                    padding: 12,
                    cornerRadius: 4
                }
            }
        }
    });
}); 