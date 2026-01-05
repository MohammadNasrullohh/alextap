// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title AlexCoin
 * @dev Kontrak token ERC20 standar untuk ekosistem AlexTap
 */
contract AlexCoin is ERC20, Ownable {
    
    // Constructor akan mencetak supply awal ke wallet yang mendeploy
    constructor() ERC20("AlexCoin", "ALEX") Ownable(msg.sender) {
        // Mencetak 1.000.000 ALEX saat deploy (dengan 18 desimal)
        _mint(msg.sender, 1000000 * 10**decimals());
    }

    /**
     * @dev Fungsi untuk mencetak token baru. Hanya bisa dipanggil oleh owner.
     * @param to Alamat penerima token
     * @param amount Jumlah token (dalam unit wei)
     */
    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }
}