const scenarios = [
  {
    name: 'Scenario 1: ครีมสำหรับผิวแห้งกับสิว',
    turns: [
      { user: 'อยากได้ครีม', type: 'initial' },
      { user: 'ผิวแห้ง', type: 'skintype' },
      { user: 'ประมาณ 300 บาท', type: 'budget' },
      { user: 'มีสิวด้วย', type: 'concern' },
      { user: 'แนะนำให้หน่อยสิ', type: 'request_recommendation' }
    ]
  },
  {
    name: 'Scenario 2: ลิปสติกสำหรับผิวปกติ',
    turns: [
      { user: 'อยากได้ลิปสติก', type: 'initial' },
      { user: 'ผิวปกติครับ', type: 'skintype' },
      { user: 'ไม่เกิน 1000', type: 'budget' },
      { user: 'ไม่มีปัญหาผิวอะไร', type: 'concern' },
      { user: 'ช่วยแนะนำหน่อยได้ไหม', type: 'request_recommendation' }
    ]
  },
  {
    name: 'Scenario 3: เซรั่มสำหรับผิวผสมกับริ้วรวย',
    turns: [
      { user: 'อยากได้เซรั่ม', type: 'initial' },
      { user: 'ผิวผสมค่ะ', type: 'skintype' },
      { user: 'งบประมาณ 500 บาท', type: 'budget' },
      { user: 'มีริ้วรวยนิดหน่อย', type: 'concern' },
      { user: 'แนะนำตัวไหนดีค่ะ', type: 'request_recommendation' }
    ]
  }
];

async function testScenario(scenarioIndex, scenario) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`${scenario.name}`);
  console.log(`${'='.repeat(60)}\n`);
  
  let messages = [];
  
  for (let turnIndex = 0; turnIndex < scenario.turns.length; turnIndex++) {
    const turn = scenario.turns[turnIndex];
    messages.push({ role: 'user', content: turn.user });
    
    try {
      const response = await fetch('http://localhost:3001/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages })
      });
      
      const text = await response.text();
      const botResponse = text.split('\n')
        .filter(l => l.startsWith('0:'))
        .map(l => JSON.parse(l.slice(2)))
        .map(p => p.textDelta)
        .join('');
      
      console.log(`Turn ${turnIndex + 1}:`);
      console.log(`  👤 User: ${turn.user}`);
      console.log(`  🤖 Bot: ${botResponse}`);
      console.log('');
      
      messages.push({ role: 'assistant', content: botResponse });
    } catch (e) {
      console.error(`  ❌ Error: ${e.message}`);
    }
  }
}

async function runAllScenarios() {
  for (let i = 0; i < scenarios.length; i++) {
    await testScenario(i, scenarios[i]);
    // Add delay between scenarios
    await new Promise(r => setTimeout(r, 500));
  }
  console.log(`\n${'='.repeat(60)}`);
  console.log('✅ ทดสอบทั้ง 3 ชุด เสร็จแล้ว');
  console.log(`${'='.repeat(60)}\n`);
}

runAllScenarios().catch(console.error);
