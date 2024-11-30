class Deck {
  constructor() {
    this.cards = this.initializeDeck();
  }

  initializeDeck() {
    const suits = ['♥', '♦', '♣', '♠'];
    const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    const deck = [];

    suits.forEach((suit) => {
      ranks.forEach((rank) => {
        deck.push(`${rank}${suit}`);
      });
    });

    return deck;
  }

  static fromPlainObject(obj) {
    const deck = new Deck();
    deck.cards = obj.cards;
    return deck;
  }

  toPlainObject() {
    return {
      cards: this.cards
    };
  }

  shuffle() {
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
  }

  deal(numCards) {
    return this.cards.splice(0, numCards);
  }

  getRandomCardFromRanks(ranks) {
    const filteredCards = this.cards.filter((card) => ranks.includes(Deck.getRank(card)));
    const randomIndex = Math.floor(Math.random() * filteredCards.length);
    return filteredCards[randomIndex];
  }

  static getRank(card) {
    return card.charAt(0);
  }
}

module.exports = Deck;