import React, { useState } from 'react';

export default function ProductPage() {
  // Variables d'état pour capturer les sélections exactes
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedVersion, setSelectedVersion] = useState('');

  // Détails du produit
  const productName = "Article YARID";
  const phoneNumber = "237XXXXXXXXX"; // À remplacer par le numéro réel

  // Fonction pour générer le lien et ouvrir WhatsApp avec les bons paramètres
  const handleWhatsAppOrder = () => {
    // Vérification pour s'assurer que le client a tout rempli
    if (!selectedColor || !selectedSize || !selectedVersion) {
      alert("Veuillez sélectionner une couleur, une taille et une version.");
      return;
    }

    // Construction du message avec la mise en forme WhatsApp (gras)
    const message = `Bonjour, je souhaite commander l'article suivant :\n\n` +
                    `*Produit* : ${productName}\n` +
                    `*Couleur* : ${selectedColor}\n` +
                    `*Taille* : ${selectedSize}\n` +
                    `*Version* : ${selectedVersion}\n\n` +
                    `Merci de me confirmer la disponibilité.`;

    // Encodage strict pour préserver les espaces et les sauts de ligne dans l'URL
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;

    // Redirection vers l'application ou la page web WhatsApp
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="p-4 max-w-md mx-auto">
      <h2 className="text-xl font-bold mb-4">{productName}</h2>

      {/* --- Section des déclinaisons --- */}
      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700">Couleur</label>
          <select 
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-white"
            value={selectedColor} 
            onChange={(e) => setSelectedColor(e.target.value)}
          >
            <option value="">Choisir une couleur</option>
            <option value="Noir">Noir</option>
            <option value="Blanc">Blanc</option>
            <option value="Rouge">Rouge</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Taille</label>
          <select 
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-white"
            value={selectedSize} 
            onChange={(e) => setSelectedSize(e.target.value)}
          >
            <option value="">Choisir une taille</option>
            <option value="M">M</option>
            <option value="L">L</option>
            <option value="XL">XL</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Version</label>
          <select 
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-white"
            value={selectedVersion} 
            onChange={(e) => setSelectedVersion(e.target.value)}
          >
            <option value="">Choisir une version</option>
            <option value="Standard">Standard</option>
            <option value="Premium">Premium</option>
          </select>
        </div>
      </div>

      {/* --- Bouton d'action épuré --- */}
      <button 
        onClick={handleWhatsAppOrder}
        className="w-full flex items-center justify-center bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded-lg transition-colors"
      >
        Commander sur WhatsApp
      </button>
    </div>
  );
}
