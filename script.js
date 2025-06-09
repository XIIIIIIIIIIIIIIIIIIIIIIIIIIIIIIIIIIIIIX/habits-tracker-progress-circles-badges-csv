document.addEventListener('DOMContentLoaded', () => {
            // Elements
            const habitsContainer = document.getElementById('habits-container');
            const badgesContainer = document.getElementById('badges-container');
            const addHabitBtn = document.getElementById('add-habit-btn');
            const exportBtn = document.getElementById('export-btn');
            const toast = document.getElementById('toast');
            
            // Habit data structure
            let habits = JSON.parse(localStorage.getItem('habits')) || [];
            let badges = JSON.parse(localStorage.getItem('badges')) || [];
            
            // Initialize
            renderHabits();
            renderBadges();
            
            // Add new habit
            addHabitBtn.addEventListener('click', () => {
                const nameInput = document.getElementById('habit-name');
                const targetInput = document.getElementById('habit-target');
                
                const name = nameInput.value.trim();
                const target = parseInt(targetInput.value);
                
                if (name && target > 0) {
                    const newHabit = {
                        id: Date.now(),
                        name,
                        target,
                        completions: {},
                        streak: 0,
                        lastCompleted: null
                    };
                    
                    habits.push(newHabit);
                    saveHabits();
                    renderHabits();
                    
                    nameInput.value = '';
                    targetInput.value = '1';
                    
                    showToast('Habitude ajoutée !');
                }
            });
            
            // Export to CSV
            exportBtn.addEventListener('click', () => {
                exportToCSV();
                showToast('Historique exporté !');
            });
            
            // Render habit cards
            function renderHabits() {
                habitsContainer.innerHTML = '';
                
                habits.forEach(habit => {
                    const today = new Date().toISOString().split('T')[0];
                    const completedToday = habit.completions[today] || 0;
                    const progress = Math.min((completedToday / habit.target) * 100, 100);
                    const progressOffset = 472 - (472 * progress / 100);
                    
                    const card = document.createElement('div');
                    card.className = 'habit-card';
                    card.innerHTML = `
                        <div class="habit-header">
                            <div class="habit-name">${habit.name}</div>
                            <button class="delete-btn" data-id="${habit.id}">×</button>
                        </div>
                        <div class="progress-container">
                            <svg class="progress-circle" viewBox="0 0 160 160">
                                <circle class="circle-bg" cx="80" cy="80" r="72"></circle>
                                <circle class="circle-progress" cx="80" cy="80" r="72" 
                                    style="--target-offset: ${progressOffset};"></circle>
                            </svg>
                            <div class="progress-text">${Math.round(progress)}%</div>
                        </div>
                        <div class="streak">Série: ${habit.streak} jours</div>
                        <button class="action-btn" data-id="${habit.id}">Valider aujourd'hui</button>
                    `;
                    
                    habitsContainer.appendChild(card);
                    
                    // Animate progress circle
                    setTimeout(() => {
                        const progressCircle = card.querySelector('.circle-progress');
                        progressCircle.style.animation = `progress-animation 1.2s ease-out forwards`;
                    }, 100);
                });
                
                // Add event listeners
                document.querySelectorAll('.action-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const id = parseInt(e.target.dataset.id);
                        completeHabit(id);
                    });
                });
                
                document.querySelectorAll('.delete-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const id = parseInt(e.target.dataset.id);
                        deleteHabit(id);
                    });
                });
            }
            
            // Complete habit for today
            function completeHabit(id) {
                const habit = habits.find(h => h.id === id);
                if (!habit) return;
                
                const today = new Date().toISOString().split('T')[0];
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                const yesterdayStr = yesterday.toISOString().split('T')[0];
                
                // Update completions
                habit.completions[today] = (habit.completions[today] || 0) + 1;
                
                // Update streak
                if (!habit.lastCompleted || habit.lastCompleted === yesterdayStr) {
                    habit.streak++;
                } else if (habit.lastCompleted !== today) {
                    habit.streak = 1;
                }
                
                habit.lastCompleted = today;
                
                // Check for badges
                checkBadges(habit);
                
                saveHabits();
                renderHabits();
                renderBadges();
                showToast('Habitude validée !');
            }
            
            // Delete habit
            function deleteHabit(id) {
                habits = habits.filter(h => h.id !== id);
                saveHabits();
                renderHabits();
                renderBadges();
                showToast('Habitude supprimée');
            }
            
            // Badge management
            function checkBadges(habit) {
                const badgeLevels = [
                    { streak: 3, name: "Débutant", icon: "🥉" },
                    { streak: 7, name: "Intermédiaire", icon: "🥈" },
                    { streak: 30, name: "Expert", icon: "🥇" },
                    { streak: 100, name: "Maître", icon: "🏆" }
                ];
                
                badgeLevels.forEach(level => {
                    if (habit.streak >= level.streak) {
                        const badgeId = `${habit.id}-${level.streak}`;
                        
                        if (!badges.some(b => b.id === badgeId)) {
                            badges.push({
                                id: badgeId,
                                habitId: habit.id,
                                habitName: habit.name,
                                level: level.name,
                                icon: level.icon,
                                date: new Date().toISOString()
                            });
                            saveBadges();
                            showToast(`Badge débloqué: ${level.name} !`);
                        }
                    }
                });
            }
            
            // Render badges
            function renderBadges() {
                badgesContainer.innerHTML = '';
                
                if (badges.length === 0) {
                    badgesContainer.innerHTML = '<p>Aucun badge obtenu pour le moment</p>';
                    return;
                }
                
                badges.forEach(badge => {
                    const habit = habits.find(h => h.id === badge.habitId);
                    if (!habit) return;
                    
                    const badgeEl = document.createElement('div');
                    badgeEl.className = 'badge';
                    badgeEl.innerHTML = `
                        <i>${badge.icon}</i>
                        <div>
                            <div>${badge.level}</div>
                            <div style="font-size:0.8em">${habit.name}</div>
                        </div>
                    `;
                    
                    badgesContainer.appendChild(badgeEl);
                });
            }
            
            // Export to CSV
            function exportToCSV() {
                let csvContent = "Habitude,Date,Completions\n";
                
                habits.forEach(habit => {
                    Object.entries(habit.completions).forEach(([date, count]) => {
                        csvContent += `"${habit.name}",${date},${count}\n`;
                    });
                });
                
                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `habitudes_${new Date().toISOString().split('T')[0]}.csv`;
                link.click();
            }
            
            // Show toast notification
            function showToast(message) {
                toast.textContent = message;
                toast.classList.add('show');
                
                setTimeout(() => {
                    toast.classList.remove('show');
                }, 3000);
            }
            
            // Save data to localStorage
            function saveHabits() {
                localStorage.setItem('habits', JSON.stringify(habits));
            }
            
            function saveBadges() {
                localStorage.setItem('badges', JSON.stringify(badges));
            }
        });