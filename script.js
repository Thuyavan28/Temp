document.addEventListener("DOMContentLoaded", function () {
  let chart;
  let temperatureData = [];
  let dateData = [];
  let currentIndex = 0;
  let updateInterval;

  const fileInput = document.getElementById("excelFile");
  const startButton = document.getElementById("startGraphBtn");
  const statusMessage = document.getElementById("statusMessage");
  const currentReading = document.getElementById("currentReading");

  fileInput.addEventListener("change", handleFile);
  startButton.addEventListener("click", startGraph);

  function handleFile(e) {
    const reader = new FileReader();
    reader.onload = function (e) {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      const rows = jsonData.slice(1);
      dateData = rows.map(row => row[0]);
      temperatureData = rows.map(row => parseFloat(row[1])).filter(v => !isNaN(v));

      if (temperatureData.length > 0) {
        statusMessage.textContent = "✅ File uploaded successfully!";
      } else {
        statusMessage.textContent = "⚠️ No valid temperature data!";
      }
    };
    reader.readAsArrayBuffer(e.target.files[0]);
  }

  function startGraph() {
    if (temperatureData.length === 0 || dateData.length === 0) {
      alert("Please upload a valid Excel file first.");
      return;
    }

    statusMessage.textContent = "📈 Graph running...";
    const ctx = document.getElementById('climateChart').getContext('2d');
    if (chart) chart.destroy();

    chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: [dateData[0]],
        datasets: [{
          label: 'Temperature (°C)',
          data: [temperatureData[0]],
          backgroundColor: [getColor(temperatureData[0])],
          borderColor: '#00f2fe',
          borderWidth: 2,
          pointRadius: 6,
          pointBackgroundColor: [getColor(temperatureData[0])],
          tension: 0.4,
          fill: true
        }]
      },
      options: {
        animation: false,
        scales: {
          y: { beginAtZero: true }
        }
      }
    });

    currentIndex = 1;
    updateReading(temperatureData[0], dateData[0]);

    clearInterval(updateInterval);
    updateInterval = setInterval(() => {
      if (currentIndex >= temperatureData.length) {
        clearInterval(updateInterval);
        statusMessage.textContent = "✅ Graph completed!";
        return;
      }

      const temp = temperatureData[currentIndex];
      const date = dateData[currentIndex];
      chart.data.labels.push(date);
      chart.data.datasets[0].data.push(temp);
      chart.data.datasets[0].pointBackgroundColor.push(getColor(temp));
      chart.update();
      updateReading(temp, date);
      currentIndex++;
    }, 1000);
  }

  function getColor(temp) {
    return temp >= 35 ? "#ff4c4c" : "#00f2fe";
  }

  function updateReading(temp, date) {
    currentReading.textContent = `🌡️ Temperature: ${temp.toFixed(1)} °C | 📅 Date: ${date}`;
  }
});
