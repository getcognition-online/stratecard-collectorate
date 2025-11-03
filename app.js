/** Stratecard Collectorate - Complete Deck Builder **/
'use strict';

const CONFIG = Object.freeze({
    DEBUG_ENABLED: true,
    MAX_DECK_SIZE: 20,
    STARTING_CREDITS: 1000,
    DECK_BUILDER: { MAX_CARD_COPIES: 3, MIN_DECK_SIZE: 10 },
    PACK_COSTS: { STANDARD: 100 },
    GACHA_RATES: { 'Common': 0.70, 'Rare': 0.075, 'Ultimate': 0.0002 }
});

class Debug {
    static init() {
        if (!CONFIG.DEBUG_ENABLED) return;
        const panel = document.createElement('div');
        panel.innerHTML = '<div style="position:fixed;top:0;left:0;right:0;z-index:10000;background:#1a1a2e;color:#eee;padding:8px 16px;border-bottom:2px solid #4a90e2">🎮 Stratecard Collectorate - Deck Builder v2.0 <button onclick="this.parentElement.parentElement.remove()" style="float:right;background:#ff6b6b;color:white;border:none;padding:4px 8px;border-radius:3px">🚀 Ship Mode</button></div>';
        document.body.insertBefore(panel, document.body.firstChild);
        const gc = document.getElementById('game-container');
        if (gc) gc.style.marginTop = '50px';
        console.log('🎮 Deck Builder initialized');
    }
    static info(msg) { console.log(`[Stratecard] ${msg}`); }
}

class ToastSystem {
    static init() {
        this.container = document.createElement('div');
        this.container.style.cssText = 'position:fixed;top:60px;right:20px;z-index:10001';
        document.body.appendChild(this.container);
    }
    static show(message, type = 'info') {
        const toast = document.createElement('div');
        const colors = {info:'#21808d',success:'#10b981',error:'#ef4444'};
        toast.style.cssText = `background:${colors[type]};color:white;padding:12px 16px;border-radius:8px;margin-bottom:8px;transition:all 0.3s`;
        toast.textContent = message;
        this.container.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }
    static success(msg) { this.show(msg, 'success'); }
    static error(msg) { this.show(msg, 'error'); }
    static warning(msg) { this.show(msg, 'error'); }
}

class GameState {
    constructor() {
        this.state = {
            player: { credits: CONFIG.STARTING_CREDITS, crystals: 20 },
            currentScreen: 'collection',
            collection: [
                {id:1,name:'Imperial Warrior',rarity:'Common',attack:2,defense:3,cost:2,level:1,count:3},
                {id:2,name:'Royal Archer',rarity:'Common',attack:3,defense:1,cost:2,level:1,count:3},
                {id:3,name:'Court Mage',rarity:'Common',attack:2,defense:2,cost:3,level:1,count:3},
                {id:4,name:'Divine Healer',rarity:'Common',attack:1,defense:4,cost:3,level:1,count:3},
                {id:5,name:'Shadow Scout',rarity:'Common',attack:1,defense:2,cost:1,level:1,count:3},
                {id:6,name:'Palace Guard',rarity:'Common',attack:1,defense:5,cost:3,level:1,count:3}
            ],
            deck: [],
            packsOpened: 0,
            pityCounter: 0
        };
        this.listeners = [];
    }
    
    dispatch(action) {
        const newState = this.reduce(this.state, action);
        this.setState(newState);
    }
    
    reduce(state, action) {
        switch (action.type) {
            case 'CHANGE_SCREEN':
                return {...state, currentScreen: action.payload.screen};
            case 'ADD_CARD_TO_DECK':
                if (state.deck.length >= CONFIG.MAX_DECK_SIZE) {
                    ToastSystem.warning('Deck is full (20 cards maximum)');
                    return state;
                }
                const card = state.collection.find(c => c.id === action.payload.cardId);
                if (!card) return state;
                const cardsInDeck = state.deck.filter(c => c.id === action.payload.cardId).length;
                if (cardsInDeck >= CONFIG.DECK_BUILDER.MAX_CARD_COPIES) {
                    ToastSystem.warning('Maximum 3 copies per card');
                    return state;
                }
                return {...state, deck: [...state.deck, {...card, deckId: Date.now() + Math.random()}]};
            case 'REMOVE_CARD_FROM_DECK':
                return {...state, deck: state.deck.filter(card => card.deckId !== action.payload.deckId)};
            case 'CLEAR_DECK':
                return {...state, deck: []};
            case 'AUTO_BUILD_DECK':
                const deck = [];
                const sortedCards = state.collection.sort((a,b) => (b.attack + b.defense) - (a.attack + a.defense));
                for (const card of sortedCards) {
                    if (deck.length >= CONFIG.MAX_DECK_SIZE) break;
                    const copies = Math.min(3, card.count, CONFIG.MAX_DECK_SIZE - deck.length);
                    for (let i = 0; i < copies; i++) {
                        deck.push({...card, deckId: Date.now() + Math.random() + i});
                    }
                }
                return {...state, deck};
            case 'OPEN_PACK':
                const newCards = [];
                for (let i = 0; i < 5; i++) {
                    newCards.push({
                        id: 100 + Math.floor(Math.random() * 50),
                        name: `New Card ${i}`,
                        rarity: 'Common',
                        attack: Math.floor(Math.random() * 5) + 1,
                        defense: Math.floor(Math.random() * 5) + 1,
                        cost: Math.floor(Math.random() * 6) + 1,
                        level: 1,
                        count: 1
                    });
                }
                return {
                    ...state,
                    collection: [...state.collection, ...newCards],
                    player: {...state.player, credits: state.player.credits - CONFIG.PACK_COSTS.STANDARD},
                    packsOpened: state.packsOpened + 1
                };
            default:
                return state;
        }
    }
    
    setState(newState) {
        this.state = newState;
        this.listeners.forEach(listener => listener(this.state));
    }
    
    subscribe(listener) {
        this.listeners.push(listener);
    }
}

class UIController {
    constructor(gameState) {
        this.gameState = gameState;
        this.currentScreen = 'collection';
        
        this.setupNavigation();
        this.setupScreens();
        this.setupDeckBuilder();
        this.renderCollection();
        
        this.gameState.subscribe(this.onStateChange.bind(this));
    }
    
    setupNavigation() {
        document.querySelectorAll('.nav-command').forEach(button => {
            button.addEventListener('click', () => {
                this.switchScreen(button.dataset.screen);
            });
        });
    }
    
    setupScreens() {
        const standardBtn = document.getElementById('buy-standard-btn');
        if (standardBtn) {
            standardBtn.addEventListener('click', () => {
                this.gameState.dispatch({type: 'OPEN_PACK'});
                ToastSystem.success('Pack opened!');
                setTimeout(() => this.renderCollection(), 100);
            });
        }
    }
    
    setupDeckBuilder() {
        ['save-deck-btn', 'clear-deck-btn', 'auto-build-btn'].forEach(id => {
            const btn = document.getElementById(id);
            if (btn) {
                btn.addEventListener('click', () => {
                    if (id === 'clear-deck-btn') {
                        if (confirm('Clear deck?')) {
                            this.gameState.dispatch({type: 'CLEAR_DECK'});
                            ToastSystem.success('Deck cleared');
                        }
                    } else if (id === 'auto-build-btn') {
                        if (confirm('Auto-build deck?')) {
                            this.gameState.dispatch({type: 'AUTO_BUILD_DECK'});
                            ToastSystem.success('Deck auto-built!');
                        }
                    } else if (id === 'save-deck-btn') {
                        if (this.gameState.state.deck.length >= 10) {
                            ToastSystem.success('Deck saved!');
                        } else {
                            ToastSystem.warning('Need at least 10 cards');
                        }
                    }
                });
            }
        });
        
        // Drag and drop
        const currentDeck = document.getElementById('current-deck');
        if (currentDeck) {
            currentDeck.addEventListener('dragover', (e) => {
                e.preventDefault();
                currentDeck.style.background = 'rgba(33, 128, 141, 0.1)';
            });
            
            currentDeck.addEventListener('dragleave', () => {
                currentDeck.style.background = '';
            });
            
            currentDeck.addEventListener('drop', (e) => {
                e.preventDefault();
                currentDeck.style.background = '';
                const cardId = e.dataTransfer.getData('text/plain');
                if (cardId) {
                    this.gameState.dispatch({type: 'ADD_CARD_TO_DECK', payload: {cardId: parseInt(cardId)}});
                }
            });
        }
    }
    
    switchScreen(screenName) {
        document.querySelectorAll('.screen').forEach(screen => screen.classList.remove('active'));
        const screen = document.getElementById(screenName);
        if (screen) {
            screen.classList.add('active');
            this.currentScreen = screenName;
            
            document.querySelectorAll('.nav-command').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.screen === screenName);
            });
            
            this.gameState.dispatch({type: 'CHANGE_SCREEN', payload: {screen: screenName}});
            
            if (screenName === 'collection') this.renderCollection();
            else if (screenName === 'deckBuilder') this.renderDeckBuilder();
        }
    }
    
    renderCollection() {
        const container = document.getElementById('units-collection');
        if (!container) return;
        
        container.innerHTML = '';
        this.gameState.state.collection.forEach(card => {
            const div = this.createCardElement(card, 'collection');
            container.appendChild(div);
        });
    }
    
    renderDeckBuilder() {
        this.renderCurrentDeck();
        this.renderAvailableCards();
        this.updateDeckAnalysis();
    }
    
    renderCurrentDeck() {
        const container = document.getElementById('current-deck');
        if (!container) return;
        
        const deck = this.gameState.state.deck;
        if (deck.length === 0) {
            container.innerHTML = '<div style="text-align:center;color:#888;padding:2rem;font-style:italic">Drag cards here to build your deck<br><small>Maximum 20 cards</small></div>';
            return;
        }
        
        container.innerHTML = '';
        const cardCounts = {};
        deck.forEach(card => {
            if (!cardCounts[card.id]) {
                cardCounts[card.id] = {card, count: 0, deckIds: []};
            }
            cardCounts[card.id].count++;
            cardCounts[card.id].deckIds.push(card.deckId);
        });
        
        Object.values(cardCounts).forEach(({card, count, deckIds}) => {
            const div = document.createElement('div');
            div.style.cssText = 'background:#fff;border:2px solid #ddd;border-radius:8px;padding:12px;margin-bottom:8px;display:flex;align-items:center;gap:12px';
            div.innerHTML = `
                <div style="flex:1">
                    <div style="font-weight:bold">${card.name}</div>
                    <div style="font-size:12px;color:#666">${card.cost}💎 • ${card.attack}⚔️ • ${card.defense}🛡️ • x${count}</div>
                </div>
                <button onclick="gameState.dispatch({type:'REMOVE_CARD_FROM_DECK',payload:{deckId:'${deckIds[0]}'}})" style="background:#ef4444;color:white;border:none;border-radius:50%;width:24px;height:24px;cursor:pointer">×</button>
            `;
            container.appendChild(div);
        });
    }
    
    renderAvailableCards() {
        const container = document.getElementById('available-cards');
        if (!container) return;
        
        container.innerHTML = '';
        this.gameState.state.collection.forEach(card => {
            if (card.count > 0) {
                const div = this.createCardElement(card, 'deckBuilder');
                container.appendChild(div);
            }
        });
    }
    
    createCardElement(card, context) {
        const div = document.createElement('div');
        div.style.cssText = 'background:#fff;border:2px solid #ddd;border-radius:8px;padding:12px;cursor:pointer;min-height:140px;display:flex;flex-direction:column;justify-content:space-between';
        
        if (context === 'deckBuilder') {
            div.draggable = true;
            div.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', card.id.toString());
            });
            div.addEventListener('dblclick', () => {
                this.gameState.dispatch({type: 'ADD_CARD_TO_DECK', payload: {cardId: card.id}});
            });
        }
        
        const inDeck = this.gameState.state.deck.filter(c => c.id === card.id).length;
        const available = Math.max(0, Math.min(card.count, 3) - inDeck);
        
        div.innerHTML = `
            <div style="text-align:center;margin-bottom:8px">
                <div style="font-weight:bold;font-size:14px;margin-bottom:4px">${card.name}</div>
                <div style="font-size:12px;color:#666">${card.rarity}</div>
            </div>
            <div style="display:flex;justify-content:space-around;font-size:12px;margin-bottom:8px">
                <div>⚔️${card.attack}</div>
                <div>🛡️${card.defense}</div>
                <div>💎${card.cost}</div>
            </div>
            <div style="text-align:center">
                <div style="font-size:12px;background:#f0f0f0;padding:4px 8px;border-radius:4px">
                    ${context === 'deckBuilder' ? `Available: ${available}` : `Lv.${card.level} × ${card.count}`}
                </div>
            </div>
        `;
        
        return div;
    }
    
    updateDeckAnalysis() {
        const deck = this.gameState.state.deck;
        
        if (deck.length === 0) {
            const elements = {
                'deck-count-display': '0/20',
                'deck-cost-display': 'Total Cost: 0',
                'avg-cost': '0',
                'total-attack': '0',
                'total-defense': '0',
                'deck-power': '0'
            };
            
            Object.entries(elements).forEach(([id, value]) => {
                const el = document.getElementById(id);
                if (el) el.textContent = value;
            });
            
            const curve = document.getElementById('mana-curve');
            if (curve) curve.innerHTML = '';
            return;
        }
        
        const totalCost = deck.reduce((sum, card) => sum + card.cost, 0);
        const avgCost = (totalCost / deck.length).toFixed(1);
        const totalAttack = deck.reduce((sum, card) => sum + card.attack, 0);
        const totalDefense = deck.reduce((sum, card) => sum + card.defense, 0);
        
        const elements = {
            'deck-count-display': `${deck.length}/20`,
            'deck-cost-display': `Total Cost: ${totalCost}`,
            'avg-cost': avgCost,
            'total-attack': totalAttack,
            'total-defense': totalDefense,
            'deck-power': totalAttack + totalDefense
        };
        
        Object.entries(elements).forEach(([id, value]) => {
            const el = document.getElementById(id);
            if (el) el.textContent = value;
        });
        
        // Mana curve
        const curve = document.getElementById('mana-curve');
        if (curve) {
            const costCounts = {};
            for (let i = 1; i <= 7; i++) costCounts[i] = 0;
            
            deck.forEach(card => {
                const cost = Math.min(card.cost, 7);
                costCounts[cost]++;
            });
            
            const maxCount = Math.max(...Object.values(costCounts), 1);
            curve.innerHTML = '';
            
            for (let cost = 1; cost <= 7; cost++) {
                const count = costCounts[cost];
                const height = Math.max((count / maxCount) * 50, count > 0 ? 10 : 2);
                
                const bar = document.createElement('div');
                bar.style.cssText = `width:24px;height:${height}px;background:${count > 0 ? '#21808d' : '#ddd'};border-radius:2px 2px 0 0;position:relative;display:flex;align-items:end;justify-content:center;color:white;font-size:10px;font-weight:bold`;
                if (count > 0) bar.textContent = count;
                
                const label = document.createElement('div');
                label.style.cssText = 'position:absolute;bottom:-16px;font-size:10px;color:#666;width:100%;text-align:center';
                label.textContent = cost === 7 ? '7+' : cost;
                
                bar.appendChild(label);
                curve.appendChild(bar);
            }
        }
    }
    
    onStateChange(state) {
        const elements = {
            'credits-amount': state.player.credits,
            'gems-amount': state.player.crystals,
            'total-units': state.collection.reduce((sum, card) => sum + card.count, 0),
            'unique-units': state.collection.length,
            'elite-units': state.collection.filter(card => ['Epic','Legendary','Ultimate'].includes(card.rarity)).length,
            'pity-counter': state.pityCounter
        };
        
        Object.entries(elements).forEach(([id, value]) => {
            const el = document.getElementById(id);
            if (el) el.textContent = value;
        });
        
        if (this.currentScreen === 'deckBuilder') {
            this.renderCurrentDeck();
            this.updateDeckAnalysis();
        }
    }
}

let game = null;
let gameState = null;

document.addEventListener('DOMContentLoaded', async () => {
    try {
        Debug.init();
        ToastSystem.init();
        
        gameState = new GameState();
        const uiController = new UIController(gameState);
        
        // Make gameState global for remove buttons
        window.gameState = gameState;
        
        ToastSystem.success('⚔️ Welcome to the Tactical Deck Constructor!');
        
        setTimeout(() => {
            const loadingScreen = document.getElementById('loading-screen');
            const gameContainer = document.getElementById('game-container');
            
            if (loadingScreen) {
                loadingScreen.style.transition = 'all 0.8s ease-out';
                loadingScreen.style.opacity = '0';
                setTimeout(() => loadingScreen.style.display = 'none', 800);
            }
            
            if (gameContainer) {
                gameContainer.style.display = 'block';
                gameContainer.style.opacity = '0';
                setTimeout(() => {
                    gameContainer.style.transition = 'all 0.8s ease-out';
                    gameContainer.style.opacity = '1';
                }, 100);
            }
            
            Debug.info('🎮 Deck Builder fully loaded!');
            
        }, 1500);
        
    } catch (error) {
        console.error('Failed to initialize:', error);
    }
});

Debug.info('📋 Stratecard Collectorate - Deck Builder loaded');