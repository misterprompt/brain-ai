// Test Complete Game Analysis Report
async function testCompleteGameAnalysis() {
  console.log('🎯 Testing Complete Game Analysis Report...\n')

  // Sample complete backgammon game
  const sampleGame = {
    gameId: "test_game_123",
    gameMoves: [
      // Opening sequence
      { move: "24/20 13/9", player: "white", dice: [4,4], explanation: "Opening doublets - strong anchor" },
      { move: "13/9 13/5", player: "black", dice: [4,4], explanation: "Black opening - good development" },
      { move: "20/16 9/5", player: "white", dice: [4,4], explanation: "Continuing with 4s - good board control" },
      { move: "24/20 6/2*", player: "black", dice: [4,4], explanation: "Black hits white's blot" },

      // Middle game with a mistake
      { move: "bar/21 6/2", player: "white", dice: [5,4], explanation: "Re-entering - MISTAKE: bar/21 instead of bar/20" },
      { move: "20/15 15/11", player: "black", dice: [5,4], explanation: "Black advances safely" },
      { move: "21/17 17/12", player: "white", dice: [4,5], explanation: "White develops board" },
      { move: "11/7 7/2", player: "black", dice: [4,5], explanation: "Black creates threats" },

      // Endgame
      { move: "12/8 8/3", player: "white", dice: [4,5], explanation: "White races home" },
      { move: "2/1 1/off", player: "black", dice: [1,1], explanation: "Black starts bearing off" },
      { move: "3/off 6/1", player: "white", dice: [3,5], explanation: "White bears off and moves" },
      { move: "24/23 23/22", player: "black", dice: [1,1], explanation: "Black advances checkers" },

      // Final moves
      { move: "1/off 17/12", player: "white", dice: [1,5], explanation: "White bears off and advances" },
      { move: "22/21 21/20", player: "black", dice: [1,1], explanation: "Black continues bearing off" },
      { move: "12/7 7/2", player: "white", dice: [5,5], explanation: "White closes in" },
      { move: "20/off 24/off", player: "black", dice: [4,4], explanation: "Black bears off remaining checkers" }
    ],
    winner: "black",
    finalScore: "1-0",
    playerColor: "white"
  }

  console.log('📊 Game Analysis Request:')
  console.log(`- Game ID: ${sampleGame.gameId}`)
  console.log(`- Total moves: ${sampleGame.gameMoves.length}`)
  console.log(`- Winner: ${sampleGame.winner}`)
  console.log(`- Player color: ${sampleGame.playerColor}`)
  console.log('- Key mistake: Move 5 (bar/21 6/2 instead of safer bar/20 6/2)\n')

  try {
    console.log('🤖 Calling Complete Game Analysis API...')

    const response = await fetch('http://localhost:3000/api/analysis/complete-game', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer test-token` // This will fail auth but test structure
      },
      body: JSON.stringify(sampleGame)
    })

    const data = await response.json()

    console.log('\n📋 API Response:')
    console.log('Status:', response.status)
    console.log('Success:', data.success)

    if (data.success && data.data) {
      const report = data.data.report

      console.log('\n📊 COMPLETE GAME ANALYSIS REPORT:')
      console.log('=' .repeat(60))

      // Game Summary
      console.log('\n🏆 GAME SUMMARY:')
      console.log(`- Winner: ${report.gameSummary.winner}`)
      console.log(`- Player Color: ${report.gameSummary.playerColor}`)
      console.log(`- Total Moves: ${report.gameSummary.totalMoves}`)
      console.log(`- Duration: ${report.gameSummary.duration}`)
      console.log(`- GNUBG Rating: ${report.gameSummary.gnubgRating || 'N/A'}`)

      // Technical Analysis
      console.log('\n📈 TECHNICAL ANALYSIS:')
      console.log(`- Average Equity: ${report.technicalAnalysis.averageEquity?.toFixed(3) || 'N/A'}`)
      console.log(`- Luck Factor: ${report.technicalAnalysis.luckFactor?.toFixed(3) || 'N/A'}`)
      console.log(`- Mistakes Identified: ${report.technicalAnalysis.mistakesIdentified}`)

      // Educational Analysis
      console.log('\n🎓 EDUCATIONAL ANALYSIS:')
      if (report.educationalAnalysis.overallAssessment) {
        console.log('Overall Assessment:', report.educationalAnalysis.overallAssessment.substring(0, 100) + '...')
      }

      // Key Mistakes with Visuals
      console.log('\n🎯 KEY MISTAKES WITH VISUALS:')
      if (report.visualMistakes && report.visualMistakes.length > 0) {
        report.visualMistakes.forEach((mistake, idx) => {
          console.log(`\n${idx + 1}. Move ${mistake.moveNumber}:`)
          console.log(`   ❌ Played: ${mistake.playedMove.notation}`)
          console.log(`   ✅ Best: ${mistake.bestMove.notation}`)
          console.log(`   📉 Equity Cost: ${mistake.equityDifference.toFixed(3)}`)
          console.log(`   📝 Explanation: ${mistake.explanation}`)
        })
      }

      // Strategic Lessons
      console.log('\n🧠 STRATEGIC LESSONS:')
      if (report.educationalAnalysis.strategicLessons) {
        console.log(report.educationalAnalysis.strategicLessons.substring(0, 150) + '...')
      }

      // Improvement Plan
      console.log('\n📈 IMPROVEMENT PLAN:')
      if (report.improvementPlan) {
        console.log('Immediate Focus:')
        report.improvementPlan.immediateFocus?.slice(0, 2).forEach(tip => {
          console.log(`- ${tip}`)
        })
      }

      // Next Steps
      console.log('\n🚀 NEXT STEPS:')
      report.nextSteps?.slice(0, 3).forEach(step => {
        console.log(`- ${step}`)
      })

      console.log('\n📊 USAGE INFO:')
      console.log('- Remaining quota:', data.data.usage.remaining)
      console.log('- Analysis Date:', new Date(data.data.analysisDate).toLocaleString())
      console.log('- AI Services:', data.data.aiServices.join(', '))

      console.log('\n' + '=' .repeat(60))
      console.log('✅ COMPLETE GAME ANALYSIS SUCCESSFUL!')
      console.log('Report provides comprehensive post-game review with:')
      console.log('- GNUBG technical analysis')
      console.log('- Claude educational explanations')
      console.log('- Visual mistake illustrations')
      console.log('- Strategic improvement plan')

    } else {
      console.log('❌ Error:', data.error)
      console.log('Details:', data.message)
    }

  } catch (error) {
    console.log('\n❌ Network Error:', error.message)

    // Show what the analysis would contain
    console.log('\n📋 EXPECTED ANALYSIS STRUCTURE:')
    console.log('When API keys are configured, the report will include:')
    console.log('1. Game Analyzer Technical Analysis:')
    console.log('   - Equity calculations for each move')
    console.log('   - Skill rating assessment')
    console.log('   - Luck factor analysis')
    console.log('')
    console.log('2. Claude Educational Analysis:')
    console.log('   - Simple explanations of mistakes')
    console.log('   - Strategic lessons learned')
    console.log('   - Improvement recommendations')
    console.log('')
    console.log('3. Visual Mistake Illustrations:')
    console.log('   - Board positions showing mistakes')
    console.log('   - Before/after move comparisons')
    console.log('   - Equity cost visualizations')
    console.log('')
    console.log('4. Comprehensive Improvement Plan:')
    console.log('   - Immediate focus areas')
    console.log('   - Practice recommendations')
    console.log('   - Long-term strategic goals')
  }
}

// Run the test
testCompleteGameAnalysis().catch(console.error)
