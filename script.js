document.addEventListener("DOMContentLoaded", function () {
  let chart;
  let temperatureData = [];
  let currentIndex = 0;
  let awaitingResponse = false;

  const brokerUrl = "wss://mqtt-dashboard.com:8884/mqtt";
  const topic = "topic_001";
  const publisherId = "client_pub";
  const subscriberId = "clientId-fhI60l4sEa";

  let isPublisherReady = false;
  let isSubscriberReady = false;

  const pubClient = mqtt.connect(brokerUrl, { clientId: publisherId });
  const subClient = mqtt.connect(brokerUrl, { clientId: subscriberId });

  pubClient.once("connect", () => {
    isPublisherReady = true;
    console.log("✅ Publisher connected");
  });

  subClient.once("connect", () => {
    isSubscriberReady = true;
    console.log("✅ Subscriber connected");
    subClient.subscribe(topic);
  });

  subClient.on("message", (topic, message) => {
    const msg = message.toString();
    console.log(`📡 Subscribed to: temp->${msg}`);

    // Plot the value after receiving MQTT response
    const value = parseFloat(msg);
    if (!isNaN(value)) {
      chart.data.labels.push(currentIndex);
      chart.data.datasets[0].data.push(value);
      chart.update();
      currentIndex++;
    }

    // Continue to next value
    awaitingResponse = false;
    sendNextValue();
  });

  document.getElementById("excelFile").addEventListener("change", handleFile);
  document.getElementById("startGraphBtn").addEventListener("click", startGraph);

  function handleFile(e) {
    const reader = new FileReader();
    reader.onload = function (e) {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

      temperatureData = jsonData
        .slice(1)
        .map((row) => parseFloat(row[1]))
        .filter((v) => !isNaN(v));

      if (temperatureData.length > 0) {
        document.getElementById("statusMessage").textContent =
          "✅ File uploaded successfully!";
      } else {
        document.getElementById("statusMessage").textContent =
          "⚠️ No valid temperature data found!";
      }
    };
    reader.readAsArrayBuffer(e.target.files[0]);
  }

  function publishTemperature(value) {
    if (isPublisherReady && !awaitingResponse) {
      const tempStr = value.toFixed(1) + "'c";
      console.log(`📤 temperature: ${tempStr}`);
      pubClient.publish(topic, tempStr);
      awaitingResponse = true;
    }
  }

  function sendNextValue() {
    if (currentIndex >= temperatureData.length) {
      document.getElementById("statusMessage").textContent = "✅ Graph finished!";
      return;
    }

    const nextTemp = temperatureData[currentIndex];
    publishTemperature(nextTemp);
  }

  function startGraph() {
    if (temperatureData.length === 0) {
      alert("Please upload a valid Excel file first.");
      return;
    }

    if (!isPublisherReady || !isSubscriberReady) {
      alert("MQTT is not connected yet. Please wait.");
      return;
    }

    document.getElementById("statusMessage").textContent = "📈 Graph running...";
    currentIndex = 0;
    awaitingResponse = false;

    const ctx = document.getElementById("climateChart").getContext("2d");
    if (chart) chart.destroy();

    chart = new Chart(ctx, {
      type: "line",
      data: {
        labels: [],
        datasets: [
          {
            label: "Temperature (°C)",
            data: [],
            borderColor: "#00f2fe",
            backgroundColor: "rgba(0, 242, 254, 0.2)",
            tension: 0.4,
          },
        ],
      },
      options: {
        animation: false,
        scales: {
          y: { beginAtZero: true },
        },
      },
    });

    sendNextValue(); // Start sending one-by-one
  }
});
